# Cross-Cutting Concerns

Error handling, logging/observability, configuration, concurrency/async, and
process boundaries (IPC). Guiding principle:

> **Cross-cutting concerns belong at the boundaries, centralized — never scattered
> through business logic.**

---

## 1. Error handling

### Taxonomy — the founding decision

Classify errors **by nature**, then choose the propagation mechanism:

| Category | Example | Mechanism | Why |
| --- | --- | --- | --- |
| **Validation (input)** | missing field, bad format | validation error at the boundary | user/client can fix it |
| **Expected business failure** | insufficient stock, duplicate email, not found | **Result / Either / typed error** | forces the caller to decide |
| **Infra/technical failure** | DB down, timeout, OOM | **exception** to a central boundary | not locally recoverable |
| **Bug / broken invariant** | impossible state, unexpected null | **fail-fast** (panic/throw) | must crash to be found |

### Result/Either vs exceptions
Exceptions are **implicit control flow**: they travel invisibly up the stack and
the signature doesn't say a function can fail. A `Result<Ok, Err>` makes failure
**explicit, typed, and compiler-enforced** ("checked exceptions done right"). Only
a type system / exhaustive match can *guarantee* every case is handled — docs
can't.

```ts
function parseUser(json: string): Result<User, ValidationError> {
  const data = safeJsonParse(json);
  if (!data) return Result.err(new ValidationError("invalid json"));
  if (typeof data.id !== "string") return Result.err(new ValidationError("missing id"));
  return Result.ok({ id: data.id });
}
```

### Translate at boundaries
> Don't handle the error where it occurs — aggregate it at the right boundary.

```
Infrastructure  → technical exception (DbException, Timeout)
   ↓ (catch + wrap at the service boundary)
Application      → Result<T, BusinessError>  (never throw)
   ↓
Top boundary     → one global handler: Error → HTTP status + JSON (RFC-9457 ProblemDetails)
```

- Low layers speak technical errors; high layers speak business meaning.
- **One** global error handler at the top; no try/catch in every layer.
- **Log once, at the boundary.** Separate the user message from internal
  diagnostics.

### Fail-fast vs resilience
Both, by category: **fail-fast** for bugs/invariants/impossible states;
**resilience** (timeout + retry + idempotency + circuit breaker + bulkhead) for
external dependencies. Any external call without a timeout is a time bomb.

Sources: https://en.senkohome.com/arch-intro-app-error-handling/ · https://www.dinhphu28.com/blog/2026/error-handling/ · https://www.echooff.dev/blog/avoid-throwing-for-expected-failures-typescript

---

## 2. Logging & observability

### Structured logs (non-negotiable)
JSON/logfmt with fixed fields — *free-text logs are searchable but un-queryable;
structured logs are queryable like a database*. Minimal field set:

| Field | Required | Note |
| --- | --- | --- |
| `ts` | yes | ISO UTC timestamp |
| `level` | yes | DEBUG / INFO / WARN / ERROR |
| `service`, `env` | yes | stable service name, environment |
| `event` | yes | machine-readable name (`payment.failed`) |
| `trace_id` | yes | end-to-end correlation |
| `span_id` / `request_id` / `user_id` / `duration_ms` | useful | as context allows |

> Log **events, not sentences**. Generate the `trace_id` **at the edge** (gateway),
> accept a valid incoming one, and propagate it **everywhere** — HTTP, queues,
> async tasks (W3C Trace Context `traceparent`).

### Three signals, one context
Metrics (cheap aggregates, alerting), Logs (discrete events), Traces (causal span
chains). OpenTelemetry unifies them via a **shared distributed context**, not
three isolated pillars: the `trace_id` on every log + exemplars let you pivot
metric → trace → exact log line. Architecturally: a vendor-neutral SDK emits via
**OTLP** to a **Collector** (agent tier per host + gateway tier for tail-sampling,
PII redaction, routing).

Sources: https://systeminternals.dev/observability/ · https://opentelemetry.io/docs/concepts/observability-primer/ · https://www.honeycomb.io/blog/opentelemetry-is-not-three-pillars

---

## 3. Configuration

### 12-Factor: separate config from code
Config is whatever varies between deploys (dev/staging/prod); code is identical
everywhere. Litmus test: *could you open-source the code right now without
exposing a single credential?* Read env vars, apply defaults, **validate types**,
expose a typed config object, and **fail fast at startup** on misconfiguration.

### Secrets: env vars ≠ protection
Env vars are **not encrypted** (readable by child processes, crash dumps,
`/proc/.../environ`, env-dumping log lines). Updated rule: **non-sensitive config
in the environment; secrets in a secret store, inject a *reference*.**

- **Env vars:** ports, feature flags, log levels, endpoints.
- **Secret store** (Vault, AWS/Azure Secrets Manager, Doppler): API keys, DB
  passwords — encrypted, access-controlled, audited, rotatable. Fetch at
  **runtime**, prefer short-lived/dynamic credentials. **Never** a secret in VCS,
  an image, or a plaintext config file; scan with gitleaks/trufflehog.

Feature flags are a special config category (they control *which* code runs vs
*how*).

Sources: https://12factor.net/config · https://kloudvin.com/article/secrets-configuration-management-fundamentals-12factor-devops/

---

## 4. Concurrency & async

### Structured concurrency
Tasks form a **tree**; child lifetimes are bounded by the parent; the parent
awaits its children; **cancellation propagates downward**.

> If a task is cancelled, all its child tasks must be cancelled, and their
> cancellation must complete before the parent's completes.

### Cooperative cancellation
Cancellation doesn't *stop* a task — it signals the result is no longer wanted; the
task must check at the right points.

```rust
let (cancel_tx, cancel_rx) = oneshot::channel::<()>();
tokio::spawn(async move {
    tokio::select! {
        _ = do_long_work() => { /* done */ }
        _ = cancel_rx       => { /* cancelled: cleanup */ }
    }
});
```

> Retrofitting cancellation into a task that wasn't designed for it is painful —
> design for it early. Document the on-cancel behavior (throw, partial, empty).

### Actors, message-passing, backpressure
Actors isolate state and serialize access by message-passing → avoid mutable
shared state. A **bounded mailbox** gives backpressure (full → sender awaits or
fails fast), preventing runaway-queue OOM. Async trap: holding a lock across an
`.await` (a std `MutexGuard` isn't `Send`) → use an async mutex or drop the guard
before awaiting.

Sources: https://rust-lang.github.io/async-book/part-reference/structured.html · https://dev.to/hiyoyok/rust-async-in-tauri-v2-what-tripped-me-up-and-how-i-fixed-it-1662

---

## 5. Process boundaries (IPC) & schema versioning

At every process/network boundary data is **serialized**; the contract must be
explicit and versionable. Protobuf's rules generalize to any contract format:

- Wire format = **Tag-Length-Value**: each field identified by a **stable number**,
  not its name → old parsers skip unknown fields (forward/backward compat).
- **Never reuse or renumber a field number;** mark deleted fields `reserved`.
- **Backward compat** = new code reads old format; **forward compat** = old code
  reads new format. In distributed systems you need both (services deploy at
  different times).
- Breaking change → a **new schema version side-by-side** (`package api.v2`),
  consumers migrate at their pace. Deprecate rather than delete; enum with
  `UNSPECIFIED = 0`; run **contract tests** + breaking-change detection (Buf) in CI.

Sources: https://protobuf.dev/programming-guides/encoding/ · https://oneuptime.com/blog/post/2026-01-24-protocol-buffer-evolution/view

---

## 6. Centralizing cross-cutting concerns

Logging, auth, caching, retries, tracing, validation, transactions are present
everywhere but distinct from business logic — centralize them, outside the domain.
Choose the mechanism by **scope**:

| Mechanism | Best for | Scope |
| --- | --- | --- |
| **Middleware** | request logging, correlation IDs, global error handling, rate limiting | all inbound traffic |
| **Filters / interceptors** | model validation, authorization, response shaping | controller/action |
| **Decorators / wrappers** | caching, retries, circuit breaker, telemetry around an operation | a service interface |
| **Pipeline (mediator behaviors)** | validation, logging, transaction per command/query | CQRS / per handler |
| **AOP / proxy** | policy-like cross-cutting rules | methods (runtime) |
| **Domain service** | invariants, business-event audit | the domain core (visible) |

Decision tree: all HTTP traffic → middleware; needs MVC context → filter; wraps one
service contract → decorator; per command/query → pipeline; a real business rule →
domain service. AOP/proxy is powerful but adds "magic" that complicates
debug/perf; explicit decorators/pipelines are usually clearer.

```ts
// Pipeline behavior: one cross-cutting concern (logging) applied to EVERY command, once
class LoggingBehavior {
  async handle(request, next) {
    const start = Date.now();
    try { return await next(); }
    finally { logger.info({ event: "handler.done", request: request.name, duration_ms: Date.now() - start }); }
  }
}
```

Sources: https://www.milanjovanovic.tech/blog/balancing-cross-cutting-concerns-in-clean-architecture · https://www.pietschsoft.com/post/2026/05/01/csharp-dotnet-cleanest-way-to-add-cross-cutting-concerns

---

## 7. Per-domain declensions

- **Game** — Dominant constraint: the **frame budget** — never block the main
  thread. Async-load on worker threads + light main-thread bookkeeping;
  time-slice the sync phase (collider registration, spawns, nav mesh) across frames
  with budgets + LRU eviction; spread large GPU uploads over frames. Prefer result
  codes and non-blocking event buffers over throwing or sync I/O in the loop.
- **Desktop (Tauri/Electron)** — A Tauri command returns `Result<T, E>` where both
  `T` and `E` are `Serialize`; an `Err` auto-rejects the frontend promise.
  Translate non-serializable errors at the IPC boundary (`map_err` to a
  serializable type). Async commands run on a thread pool (don't block);
  CPU-heavy → `spawn_blocking`. Long-task cancellation via an `Arc<AtomicBool>`
  flag in `tauri::State`, checked between iterations; progress via the event system
  (`emit`/`listen`), not the return value. In Electron, the main/renderer boundary
  is a **security** boundary: `contextIsolation: true`, expose a minimal
  `contextBridge` API (never raw `ipcRenderer`), validate every IPC input and check
  the sender.

```rust
#[tauri::command]
async fn batch_process(
    paths: Vec<String>,
    cancel: tauri::State<'_, CancelToken>,   // Arc<AtomicBool>
    window: tauri::Window,
) -> Result<(), String> {
    for (i, p) in paths.iter().enumerate() {
        if cancel.is_cancelled() { return Err("cancelled".into()); }
        process_single(p).await.map_err(|e| e.to_string())?;
        window.emit("batch-progress", i + 1).ok();   // progress = events, not return value
    }
    Ok(())
}
```

- **Web/SPA + API** — Validation at the boundary, typed/Result for business
  outcomes, infra exceptions → global middleware mapping to HTTP + ProblemDetails;
  UI **error boundaries** so one failure doesn't crash the tree. `trace_id` at the
  edge, JSON logs; secrets stay server-side (never bundled).
- **Service/backend** — Result/error values scale better in distributed systems;
  catch infra exceptions at the service boundary and wrap; retry + idempotency +
  circuit breaker for external deps. OTel SDK → OTLP → Collector; config via
  12-factor + secret store; bounded mailboxes for backpressure; versioned schemas
  with contract tests; propagate trace context through queue headers.

---

## 8. Traps

| Trap | Why it's bad | Fix |
| --- | --- | --- |
| **Swallowing** (`catch {}`) | silent failure = broken but undetected | catch *specific* types at boundaries; never an empty catch |
| `throw new Error("error")` / return `null`/`-1` | zero information, untyped failure | typed error / Result / discriminated union |
| **Unstructured logging** | un-queryable, lost correlation | JSON + fixed fields + `trace_id` |
| **Logging the error N times** | noise, double counting | log **once**, at the boundary |
| **Hardcoded secrets** | env vars unencrypted, leak | secret store + runtime reference; scan with gitleaks |
| **Blocking the main/UI thread** | freeze, frontend timeout, hitch | async + worker threads + time-slicing + `spawn_blocking` |
| **Lock held across `.await`** | `MutexGuard` not `Send`, deadlock | async mutex; drop the guard before awaiting |
| **External call without timeout** | "time bomb" | timeout + circuit breaker + bulkhead |
| **Unbounded queue** | OOM (queue flooding) | bounded mailbox → backpressure |
| **Renumber/reuse a field number** | silent data corruption | `reserved` + new version |
| **Raw `ipcRenderer` exposed** | XSS → RCE | minimal `contextBridge` API + input/sender validation |
