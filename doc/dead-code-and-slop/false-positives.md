# False positives — code that looks dead and is not

**Research date:** 2026-08-31
**Question:** which language- and framework-level mechanisms make
statically-unreferenced code actually live?

This file is the delete-safety counterweight to a dead-code or slop audit.
Every entry is a documented mechanism by which a symbol with **zero static
callers** is still executed, still required to compile, or still the product
being shipped. Format per entry: **mechanism → why analysis misses it → how to
detect → required verification**. Unity/C#-specific false positives (serialized
fields, `SendMessage`, `[RuntimeInitializeOnLoadMethod]`, `UnityEvent` wiring,
scene/prefab and asset-GUID references, IL2CPP stripping) are covered in
[unity-and-csharp.md](./unity-and-csharp.md) and are deliberately not repeated
here.

**Source verification status.** Three source families were re-checked live
during this pass and their claims are confirmed: `importlib.import_module`
([Python docs](https://docs.python.org/3/library/importlib.html#importlib.import_module));
module-level `__getattr__`, available since Python 3.7, which intercepts lookup
of attributes absent from the module namespace and is used for lazy submodule
imports and deprecated-alias shims ([PEP 562](https://peps.python.org/pep-0562/),
[data model](https://docs.python.org/3/reference/datamodel.html)); and Cargo
targets, where `src/bin/`, `examples/`, `tests/`, and `benches/` are
auto-discovered as build targets and `[[bin]]`/`[[example]]`/`[[bench]]` are
TOML arrays of tables for non-conventional layouts
([Cargo book](https://doc.rust-lang.org/cargo/reference/cargo-targets.html)).
All other URLs are canonical documentation entry points cited from prior
knowledge and **not** re-checked in this session; deep anchors that could not be
confirmed are tagged `(unverified anchor)`, and any claim not grounded in a
primary source is tagged `(unverified)`.

## 0. The one question that decides everything

Before any tool output is interpreted: **is this repository a closed world or an
open world?**

- **Closed world (application, service, game).** Every entry point is inside the
  repo or its deploy config. An unreferenced symbol is a deletion *candidate*,
  and the twelve classes below are the exception list.
- **Open world (library, SDK, plugin, public API).** The exported surface is the
  product. Zero in-repo callers is the *expected* state for the whole public API,
  and removing it is a breaking change under semantic versioning
  ([semver.org](https://semver.org/)). A reachability tool run on a library
  measures nothing but the density of its own examples.

Mixed repos (an app that also publishes a package, a monorepo with internal
libraries) are open-world **per published package boundary**. Establish this
boundary before the audit; it changes the answer more than any tool setting.

## 1. Reflection and dynamic dispatch by name

- **Mechanism** — the callee is selected at runtime from a string. Python:
  `getattr()`, `globals()`, `eval()`
  ([built-in functions](https://docs.python.org/3/library/functions.html#getattr)),
  `importlib.import_module()`
  ([importlib](https://docs.python.org/3/library/importlib.html#importlib.import_module)),
  and module-level `__getattr__` for lazy or redirected attributes
  ([PEP 562](https://peps.python.org/pep-0562/),
  [data model](https://docs.python.org/3/reference/datamodel.html#customizing-module-attribute-access)).
  Java: `Class.forName(String)` plus the `java.lang.reflect` API
  ([Class Javadoc](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/Class.html)).
  .NET: `Type.GetType(string)` and `Activator.CreateInstance`
  ([Type.GetType](https://learn.microsoft.com/en-us/dotnet/api/system.type.gettype),
  [Activator.CreateInstance](https://learn.microsoft.com/en-us/dotnet/api/system.activator.createinstance)).
  JavaScript: computed member access `obj[name]`, dynamic
  [`import()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import),
  [`eval`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval),
  and the
  [`Function` constructor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/Function).
  Ruby: `Object#send` / `public_send`
  ([Ruby core docs](https://docs.ruby-lang.org/en/master/Object.html) — anchor
  unverified). PHP: variable functions `$fn()`
  ([PHP manual](https://www.php.net/manual/en/functions.variable-functions.php)).
- **Why analysis misses it** — the call graph edge exists only as data. No
  compiler, linker, LSP index, or `grep` for the identifier can see a call site
  that is assembled from a prefix and a variable. The .NET ecosystem treats this
  as a first-class hazard: trimming emits warnings precisely because reflection
  targets are not statically provable
  ([trim warnings](https://learn.microsoft.com/en-us/dotnet/core/deploying/trimming/fixing-warnings)).
- **How to detect** — grep the *mechanism*, not the symbol:
  `getattr\(|globals\(\)|importlib|__import__|\beval\(|exec\(` (Python);
  `Class\.forName|getDeclaredMethod|newInstance` (Java);
  `Type\.GetType|Activator\.CreateInstance|GetMethod\(|InvokeMember` (C#);
  `\[[a-zA-Z_$][\w$]*\]\s*\(|new Function\(|import\(` (JS/TS);
  `\.send\(|public_send` (Ruby). Then grep for the candidate symbol as a
  **string literal** across the whole repo, including `.json`, `.yaml`, `.toml`,
  `.xml`, `.env`, `.sql`, and migration files.
- **Required verification** — the symbol name must not appear as a bare string
  anywhere in the repo or in deployment config, and no reflective call site may
  build a name from a prefix/suffix that could produce it (`f"handler_{kind}"`,
  `name + "Service"`). If a name is *computed*, the class is unresolvable
  statically and deletion is forbidden without a runtime trace.

## 2. Entry points nothing in the repo references

- **Mechanism** — the caller is outside the source tree: an OS process launch, a
  package manager shim, a scheduler, or a server that imports by config string.
  Concretely: `if __name__ == "__main__"` blocks; Python `console_scripts`
  entry points declared in packaging metadata
  ([entry-points spec](https://packaging.python.org/en/latest/specifications/entry-points/));
  `bin` in `package.json`
  ([npm package.json docs](https://docs.npmjs.com/cli/v10/configuring-npm/package-json));
  Cargo binary targets and `[[bin]]`
  ([Cargo targets](https://doc.rust-lang.org/cargo/reference/cargo-targets.html));
  AWS Lambda handlers named as a `module.function` string in function config
  ([Lambda handler docs](https://docs.aws.amazon.com/lambda/latest/dg/python-handler.html));
  Celery tasks resolved by registered task **name**, not by import
  ([Celery task names](https://docs.celeryq.dev/en/stable/userguide/tasks.html));
  WSGI/ASGI application objects named on a command line
  ([gunicorn](https://docs.gunicorn.org/en/stable/run.html),
  [uvicorn](https://www.uvicorn.org/));
  route handlers registered by decorator/annotation; cron and CI job scripts;
  test functions discovered by naming convention
  ([pytest discovery conventions](https://docs.pytest.org/en/stable/explanation/goodpractices.html))
  or by annotation ([JUnit 5 user guide](https://junit.org/junit5/docs/current/user-guide/));
  and import-time side effects in `__init__.py` or module top level.
- **Why analysis misses it** — the reference lives in `pyproject.toml`,
  `package.json`, a Dockerfile `CMD`, a Kubernetes manifest, a Terraform
  resource, a systemd unit, a crontab, or a cloud console setting. Reachability
  tools are seeded from a root set; if the root set omits these, everything
  downstream of them is reported dead — the single largest source of mass false
  positives.
- **How to detect** — enumerate roots before the audit: `pyproject.toml` /
  `setup.cfg` `[project.scripts]`, `package.json` `bin` + `scripts`,
  `Cargo.toml` `[[bin]]`, `Dockerfile`/`docker-compose*`/`Procfile` `CMD`
  `ENTRYPOINT`, `.github/workflows/**`, `*.tf`, `serverless.yml`, `k8s/**`,
  crontabs, and any `--app`/`--module`/`handler` string. Grep decorators:
  `@app\.(get|post|route)|@router\.|@celery|@shared_task|@task|@Scheduled`.
- **Required verification** — the audit's root set must be written down and
  reviewed. A symbol is only a candidate if it is unreachable from **every**
  enumerated root, including the deploy configuration, not merely from `main`.

## 3. Dependency injection and IoC containers

- **Mechanism** — a type is registered against an interface or discovered by
  attribute/annotation and instantiated by the container; no `new` ever appears.
  .NET `Microsoft.Extensions.DependencyInjection`
  ([DI docs](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection));
  Spring classpath scanning of `@Component`/`@Service`
  ([Spring reference](https://docs.spring.io/spring-framework/reference/core/beans/classpath-scanning.html));
  [InversifyJS](https://inversify.io/); Python `injector`; FastAPI
  [`Depends`](https://fastapi.tiangolo.com/tutorial/dependencies/).
- **Why analysis misses it** — the only textual link between interface and
  implementation is one registration line, or nothing at all when scanning is
  convention-based. The concrete class has zero direct callers by design.
- **How to detect** — grep registrations: `AddScoped|AddSingleton|AddTransient`
  (.NET), `@Component|@Service|@Repository|@Bean|ComponentScan` (Spring),
  `bind<|toSelf|@injectable` (Inversify), `Depends\(` (FastAPI),
  `binder.bind|@inject` (Python). Then check assembly-scanning calls that
  register **by convention** over a whole namespace — under those, no per-type
  registration line exists at all.
- **Required verification** — never treat a single-implementation interface as
  over-abstraction on evidence of arity alone: the container may require the
  interface for resolution, and tests may substitute a double. Confirm the type
  is neither registered explicitly, nor located in a scanned namespace/assembly,
  nor named in a configuration-driven registration table.

## 4. Public library API surface

- **Mechanism** — an exported symbol whose callers are, by construction, other
  people's code. Node package entry points via `exports`/`main`
  ([Node.js packages](https://nodejs.org/api/packages.html)); Python `__all__`
  and package re-exports
  ([modules tutorial](https://docs.python.org/3/tutorial/modules.html));
  Rust `pub` visibility
  ([Rust reference](https://doc.rust-lang.org/reference/visibility-and-privacy.html));
  any documented, versioned surface under
  [semantic versioning](https://semver.org/).
- **Why analysis misses it** — the tool's world ends at the repo boundary. Every
  correct public export is, from inside, unreferenced.
- **How to detect** — read `exports`/`main`/`types` in `package.json`, `__all__`
  and `__init__.py` re-exports, `pub` items reachable from the crate root,
  `.d.ts` surfaces, and the docs site. If the repo publishes to a registry
  (`npm publish`, `twine`, `cargo publish`, NuGet), treat it as open-world.
- **Required verification** — removal of a public symbol is a semver-major
  decision, not an audit finding. It requires an explicit deprecation cycle;
  the audit may only *propose* it. Internal-only helpers must be proven
  non-exported (not re-exported transitively through a barrel file).

## 5. Serialization, schema, and data-driven references

- **Mechanism** — the symbol exists to be matched against external data. ORM
  model fields mapped to columns
  ([Django models](https://docs.djangoproject.com/en/stable/topics/db/models/));
  DTO fields written only by a (de)serializer; protobuf fields, where removal
  requires `reserved` to protect the wire format
  ([Protocol Buffers language guide](https://protobuf.dev/programming-guides/proto3/));
  template variables resolved by name at render time
  ([Jinja templates](https://jinja.palletsprojects.com/en/stable/templates/) —
  version path unverified); i18n message keys; database migrations; GraphQL
  resolvers matched to schema fields by name
  ([GraphQL execution](https://graphql.org/learn/execution/)); OpenAPI
  `operationId` values consumed by client generators
  ([OpenAPI Specification](https://spec.openapis.org/oas/latest.html)).
- **Why analysis misses it** — the reference is a **string in another file** or
  in a database, not an identifier in the language graph. A field written by
  `json.loads`/`System.Text.Json`/an ORM has no assignment site in source.
- **How to detect** — grep the candidate name across non-code files:
  `*.json *.yaml *.yml *.toml *.xml *.graphql *.proto *.sql *.html *.jinja`
  `*.hbs *.cshtml *.po *.resx`, plus migration directories. For ORM entities,
  check whether a live database column depends on the field.
- **Required verification** — a serialized field may only be removed with a
  migration story for data already written: protobuf field numbers must be
  `reserved`, save/DTO schemas must be versioned
  ([save-persistence pitfalls](../save-persistence/pitfalls.md), items 6 and 15),
  and a DB column drop needs a migration. Deleting the code without the data
  plan corrupts persisted state.

## 6. Conditional compilation and platform-specific code

- **Mechanism** — the code is live only under a configuration the analyzer did
  not build: Rust `#[cfg]`
  ([conditional compilation](https://doc.rust-lang.org/reference/conditional-compilation.html))
  driven by Cargo `features`
  ([features](https://doc.rust-lang.org/cargo/reference/features.html)); C/C++
  `#ifdef`; C# `#if` with `DefineConstants`
  ([C# preprocessor directives](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/preprocessor-directives));
  runtime platform checks such as `sys.platform`
  ([sys](https://docs.python.org/3/library/sys.html)); `NODE_ENV`-gated branches
  eliminated by bundler dead-code elimination; and runtime feature flags.
- **Why analysis misses it** — a static tool observes exactly one configuration.
  Under `--target x86_64-unknown-linux-gnu` with default features, the Windows
  branch and every optional-feature module are literally absent from the AST.
  **A tool run under one configuration cannot speak about any other.**
- **How to detect** — enumerate the configuration matrix first:
  `grep -rn '#\[cfg\|#ifdef\|#if \|sys\.platform\|process\.env\.NODE_ENV'`,
  read `[features]` in `Cargo.toml`, `DefineConstants` in `*.csproj`/`Directory.Build.props`,
  build matrices in CI workflows, and the feature-flag service configuration.
- **Required verification** — the candidate must be unreferenced under **every**
  shipped platform × feature-flag combination, verified either by re-running the
  analysis per configuration or by reading the guards manually. Flags that are
  currently off in production but still shipped keep their code alive.

## 7. Generated code and codegen inputs

- **Mechanism** — files emitted by a generator (protobuf stubs, ORM migrations,
  GraphQL client types, OpenAPI clients, engine-generated sources), and the
  schemas/templates whose only consumer is the generator itself.
- **Why analysis misses it** — generated output often contains large unused
  surfaces (every message, every operation), and generator inputs have no
  in-language caller at all.
- **How to detect** — header markers (`// Code generated by ... DO NOT EDIT`,
  `<auto-generated>`), `.gitattributes` `linguist-generated`, output paths named
  in the codegen config (`buf.gen.yaml`, `codegen.yml`, `openapi-generator`
  config, `build.rs`, MSBuild targets).
- **Required verification** — never edit or delete generated output: it is
  restored on the next generator run, so the change is pointless churn. Never
  delete a schema/template because it has no caller: that is destructive and
  removes the source of truth. Both categories are **excluded from the audit**;
  reduce them at the schema level or not at all.

## 8. Tests, fixtures, benchmarks, examples, doc snippets

- **Mechanism** — code discovered by convention rather than called: pytest test
  functions and `conftest.py` fixtures
  ([pytest good practices](https://docs.pytest.org/en/stable/explanation/goodpractices.html),
  [fixtures reference](https://docs.pytest.org/en/stable/reference/fixtures.html));
  JUnit annotated methods
  ([JUnit 5 user guide](https://junit.org/junit5/docs/current/user-guide/));
  Python doctests executed from docstrings
  ([doctest](https://docs.python.org/3/library/doctest.html)); Rust doc-tests
  ([rustdoc documentation tests](https://doc.rust-lang.org/rustdoc/write-documentation/documentation-tests.html))
  and the `examples/` target directory
  ([Cargo targets](https://doc.rust-lang.org/cargo/reference/cargo-targets.html));
  benchmark harnesses; test helpers used by exactly one test.
- **Why analysis misses it** — a production-reachability query is the wrong
  question here. Test code is *supposed* to have no production caller, and
  fixtures are injected by name by the framework.
- **How to detect** — path conventions (`tests/`, `test_*.py`, `*_test.go`,
  `*.spec.ts`, `benches/`, `examples/`), `conftest.py`, annotation grep, and
  docstring `>>>` markers.
- **Required verification** — exclude these trees from the reachability query
  entirely. A genuinely dead test is one that asserts nothing or is skipped
  unconditionally — a different audit, decided by reading the test, never by a
  caller count.

## 9. Interface, trait, and protocol conformance

- **Mechanism** — a member exists to satisfy a contract, not because a specific
  call site names it: interface/abstract implementations and `override`s;
  `IDisposable.Dispose` invoked by `using`
  ([IDisposable](https://learn.microsoft.com/en-us/dotnet/api/system.idisposable));
  Python `__enter__`/`__exit__` invoked by `with`
  ([data model](https://docs.python.org/3/reference/datamodel.html)) and
  structural `typing.Protocol` conformance
  ([typing](https://docs.python.org/3/library/typing.html)); operator overloads
  and dunder methods; event-handler signatures bound at registration.
- **Why analysis misses it** — dispatch is virtual or syntactic. The call goes
  through the base type or through a language construct, so the concrete member
  has no direct reference; structural typing has no declaration link at all.
- **How to detect** — check whether the member name matches a base/interface
  member (`override`, `@Override`, `impl Trait for`, ABC `@abstractmethod`), a
  dunder/operator name, or a delegate signature used in `+=` / `AddListener`
  style registration.
- **Required verification** — deletion is legal only if the whole conformance is
  removed and the type is not consumed through the interface anywhere, including
  reflectively (§1) and via DI (§3). Removing one method of an implemented
  interface usually fails to compile — a loud, cheap error — but removing a
  structural-protocol member fails silently at runtime.

## 10. Intentionally unused API: symmetry, signatures, future contract

- **Mechanism** — parameters imposed by a callback or override signature, and
  deliberately-ignored bindings. Every ecosystem has a convention for this:
  ESLint `no-unused-vars` exposes `args` and `argsIgnorePattern` options
  ([ESLint rule](https://eslint.org/docs/latest/rules/no-unused-vars)); Rust
  suppresses the warning with a leading underscore
  ([The Rust Programming Language](https://doc.rust-lang.org/book/) — anchor
  unverified); Go has the blank identifier `_`
  ([Go specification](https://go.dev/ref/spec)); C++ commonly uses
  `(void)x;` or `[[maybe_unused]]` (unverified).
- **Why analysis misses it** — the linter reports absence of use, which is true
  and irrelevant: the parameter exists because the signature is imposed from
  outside.
- **How to detect** — leading `_`, `_unused`, `@SuppressWarnings`,
  `// eslint-disable-next-line no-unused-vars`, `#pragma warning disable`,
  `[[maybe_unused]]`. Any of these is an explicit author statement.
- **Required verification** — an explicit ignore marker is a documented
  intention: treat it as a stop, not as a finding. Removing a positional
  parameter from a callback silently shifts the remaining arguments in
  dynamically-typed languages.

## 11. Vendored and third-party trees

- **Mechanism** — code that is copied in, not authored here: `vendor/`,
  `node_modules/`, `third_party/`, `external/`, `Pods/`, and (Unity) `Library/`,
  `Packages/`, `Assets/Plugins/` — see
  [unity-and-csharp.md](./unity-and-csharp.md).
- **Why analysis misses it** — nothing is missed: the analysis is correct and
  the answer is still irrelevant. Vendored trees legitimately contain a full,
  mostly-unused library surface.
- **How to detect** — `.gitignore`, lockfiles, package manifests, and the
  directory names above.
- **Required verification** — excluded by policy. Editing them is overwritten on
  the next install; the correct lever is the dependency version or removing the
  dependency, and even then only with a build.

## 12. Code kept for a documented reason

- **Mechanism** — paths that are rarely or never executed *in normal operation*
  and are still required: deprecated-but-supported public API inside its
  announced window (a semver contract —
  [semver.org](https://semver.org/)); backwards-compatibility shims; one-shot
  migration code that must still run on old data; disaster-recovery and rollback
  paths; security controls that only fire under attack; error handling for rare
  conditions; feature-flag kill switches.
- **Why analysis misses it** — coverage tooling and call-graph tools measure the
  *common* path. Zero production hits over a month says nothing about a path
  designed to fire once per data-migration or once per incident.
- **How to detect** — `@deprecated`, `[Obsolete]`, `#[deprecated]`, `DeprecationWarning`,
  and comments containing `legacy`, `compat`, `migration`, `do not remove`,
  `keep for`, `rollback`, `fallback`, `recovery`, plus CHANGELOG and ADR entries.
- **Required verification** — these are the **highest-cost** false positives:
  deletion is silent at build time, silent in tests, and catastrophic on the day
  the path is needed. Require an explicit, dated statement that the window has
  closed (deprecation expired, no remaining old-format data, control superseded)
  before proposing removal — and even then, propose, do not delete.

## Master table

| False-positive class | Detection (grep / config to read) | Verification that clears it | Failure mode if wrongly deleted |
|---|---|---|---|
| Reflection / dynamic dispatch (§1) | `getattr(`, `importlib`, `eval(`, `Class.forName`, `Type.GetType`, `Activator.CreateInstance`, `obj[name]`, `.send(` ; symbol as string literal anywhere | No literal or computed name can resolve to the symbol; runtime trace on the reflective site | **Silent** — runtime `AttributeError`/`TypeLoadException` only on the affected path |
| External entry points (§2) | `[project.scripts]`, `bin`, `[[bin]]`, Dockerfile `CMD`, k8s/Terraform/serverless config, crontab, `@app.route`, `@shared_task` | Symbol unreachable from a **written-down** root set including deploy config | **Silent** — a job, route, or CLI stops existing; often noticed days later |
| DI / IoC registration (§3) | `AddScoped/Singleton/Transient`, `@Component`, `@Service`, `bind<`, `Depends(`, assembly-scan calls | Not registered, not in a scanned namespace, not named in config | **Silent** — container resolution failure at request time |
| Public library API (§4) | `exports`/`main`, `__all__`, `pub`, `.d.ts`, publish step in CI | Repo proven closed-world, or a semver-major deprecation cycle completed | **Silent for this repo, loud for consumers** — downstream builds break |
| Serialization / schema / config strings (§5) | Name grepped in `*.json/yaml/toml/xml/proto/graphql/sql`, templates, i18n catalogs, migrations | Migration story exists for already-written data; protobuf field `reserved` | **Silent** — data loss or corruption on old payloads |
| Conditional compilation / platform (§6) | `#[cfg]`, `#ifdef`, `#if`, `DefineConstants`, `[features]`, `sys.platform`, CI matrix | Unreferenced under **every** shipped platform × feature combination | **Loud on the other platform's build, silent until that build runs** |
| Generated code and codegen inputs (§7) | `DO NOT EDIT` headers, `linguist-generated`, codegen config output paths | Excluded by policy | Output: **churn** (regenerated). Input schema: **silent and destructive** |
| Tests, fixtures, examples, doctests (§8) | `tests/`, `test_*`, `conftest.py`, `benches/`, `examples/`, `>>>` in docstrings | Excluded from the reachability query; deadness judged by reading the test | **Silent** — lost coverage, no build error |
| Interface / protocol conformance (§9) | `override`, `@Override`, `impl Trait for`, `@abstractmethod`, dunders, `Dispose` | Whole conformance removed and no interface-typed consumer remains | **Loud** for nominal interfaces (compile error); **silent** for structural/duck typing |
| Intentionally unused parameters (§10) | `_` prefix, `[[maybe_unused]]`, `argsIgnorePattern`, disable comments | Signature is not imposed by a callback/override contract | **Silent** — argument shifting in dynamic languages |
| Vendored / third-party trees (§11) | `vendor/`, `node_modules/`, `third_party/`, `Packages/`, lockfiles | Excluded by policy | **Churn** — reverted on next install |
| Deprecation / compat / migration / recovery (§12) | `@deprecated`, `[Obsolete]`, `legacy`, `migration`, `rollback`, `do not remove`, CHANGELOG/ADR | Dated statement that the window closed and no old-format data remains | **Silent and catastrophic** — fails only on the rare day it was written for |
| Unity/C# engine wiring | see [unity-and-csharp.md](./unity-and-csharp.md) | see that file | **Silent** — null references and unwired scene behaviour at play time |

The silent/loud column is the ranking key. A deletion that breaks the compiler
costs one build cycle. A deletion that breaks a once-a-year migration path, a
disaster-recovery route, or a security control costs an incident, and the causal
link back to the audit is usually lost by then.

## Hard stops — do not delete, regardless of tool output

An agent must **not** delete when any of the following holds. These override any
reachability result, coverage report, or linter finding.

1. **The symbol name appears as a string** anywhere in the repo or in deploy
   configuration — or could be produced by a computed name in a reflective call.
2. **The repo is open-world at this boundary** and the symbol is part of the
   published surface; propose deprecation instead (§4).
3. **The audit's root set was never enumerated**, so unreachability was measured
   from an unknown starting point (§2).
4. **The analysis covered one configuration only** and the code is behind
   `#[cfg]`/`#if`/feature flag/platform check (§6).
5. **The file is generated, or is a codegen input** (schema, template, `.proto`,
   migration) (§7).
6. **The path is vendored or third-party** (§11).
7. **The symbol carries an explicit intent marker** — `@deprecated`,
   `[Obsolete]`, `_`-prefix, `maybe_unused`, `do not remove`, `keep for`,
   or an ADR/CHANGELOG entry (§10, §12).
8. **The member satisfies a contract** — interface, abstract base, trait,
   protocol, operator/dunder, callback or event signature (§9).
9. **The field is serialized or mapped**, and no migration exists for data
   already written (§5).
10. **The code is a compatibility shim, migration, recovery, kill switch, or
    security control** and no dated statement says its window has closed (§12).
11. **Deletion cannot be validated** by an available build, test suite, or
    typecheck — with no executable proof, the change is a guess.
12. **The working tree is dirty or the change is unrequested in scope** — batch
    deletions must be reviewable and revertible commit by commit.

When a candidate is blocked by a hard stop, the correct output is a **report**
— symbol, evidence for deadness, the blocking condition, and the verification a
human could run — never a deletion.
