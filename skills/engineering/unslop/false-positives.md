# False positives

Twelve mechanisms by which a symbol with **zero static callers** is still
executed, still required to compile, or still the product being shipped. Each
entry: how to detect the mechanism, what clears the suspect, and whether a
wrong deletion fails **loud** (a build error, one cycle lost) or **silent** (a
runtime failure on a rare path, whose link back to the audit is already lost).

Work every suspect against this list before it becomes a candidate. Order
matters only in one place: settle closed world versus open world first.

## 1. Reflection and dynamic dispatch — silent

The callee is selected at runtime from a string: `getattr`, `globals()`,
`eval`, `importlib.import_module`, module-level `__getattr__`;
`Class.forName` and `java.lang.reflect`; `Type.GetType`,
`Activator.CreateInstance`, `GetMethod`; computed member access `obj[name]`,
dynamic `import()`, the `Function` constructor; `send` / `public_send`; PHP
variable functions.

**Detect** the mechanism rather than the symbol, then search the symbol as a
bare string literal across every file type, including `.json`, `.yaml`,
`.toml`, `.xml`, `.env`, `.sql`, and migrations.

**Clears when** no literal resolves to the symbol *and* no reflective site
builds a name from a prefix and a variable. A **computed** name (`f"handler_{kind}"`,
`name + "Service"`) is statically unresolvable: the enquiry ends there.

## 2. Entry points nothing in the repo references — silent

The caller is outside the source tree: `__main__` blocks, `console_scripts`,
`package.json` `bin`, Cargo `[[bin]]`, Lambda handlers named by string,
Celery tasks resolved by registered name, WSGI/ASGI apps named on a command
line, route decorators, cron and CI jobs, tests discovered by convention.

**Detect** by enumerating roots: packaging manifests, `Dockerfile`,
`docker-compose*`, `Procfile`, `.github/workflows/**`, `*.tf`,
`serverless.yml`, `k8s/**`, crontabs, and any `--app` / `handler` string.

**Clears when** the symbol is unreachable from a **written-down** root set that
includes deploy configuration — not merely from `main`. This is the single
largest source of mass false positives, because one missing root cascades.

## 3. Dependency injection and IoC — silent

A type is registered against an interface, or discovered by annotation, and
instantiated by a container. No `new` ever appears.

**Detect** `AddScoped` / `AddSingleton` / `AddTransient`, `@Component` /
`@Service` / `@Bean` / `ComponentScan`, `bind<` / `@injectable`, `Depends(`,
`@inject`, and assembly-scanning calls that register by convention with no
per-type line at all.

**Clears when** the type is neither registered explicitly, nor inside a scanned
namespace or assembly, nor named in a configuration-driven registration table.
A single-implementation interface is never over-abstraction on arity alone: the
container may need it to resolve, and tests may substitute a double.

## 4. Public library API — silent here, loud downstream

An exported symbol whose callers are, by construction, other people's code.
From inside the repository, every correct public export looks unreferenced.

**Detect** `exports` / `main` / `types` in `package.json`, `__all__` and
`__init__.py` re-exports, `pub` items reachable from the crate root, `.d.ts`
surfaces, the docs site, and any publish step in CI.

**Clears when** the repository is proven closed-world, or a semver-major
deprecation cycle has completed. Removing public surface is a release decision,
not an audit finding: propose it, never perform it. Check that an "internal"
helper is not re-exported transitively through a barrel file.

## 5. Serialization, schema, and data-driven references — silent

The symbol exists to match external data: ORM fields mapped to columns, DTO
fields written only by a deserializer, protobuf fields whose removal requires
`reserved`, template variables resolved by name, i18n keys, GraphQL resolvers
matched by name, OpenAPI `operationId` values consumed by client generators.

**Detect** by grepping the name across `*.json`, `*.yaml`, `*.toml`,
`*.xml`, `*.graphql`, `*.proto`, `*.sql`, templates, translation catalogs,
and migration directories.

**Clears when** a migration story exists for data already written: protobuf
field numbers reserved, save and DTO schemas versioned, a database migration
for a dropped column. Deleting the code without the data plan corrupts
persisted state.

## 6. Conditional compilation and platform code — loud elsewhere, silent until then

`#[cfg]` with Cargo features, `#ifdef`, C# `#if` with `DefineConstants`,
`sys.platform` checks, `NODE_ENV`-gated branches, runtime feature flags.

**Detect** by enumerating the configuration matrix: the guards themselves,
`[features]`, `DefineConstants` in `*.csproj` and `Directory.Build.props`, CI
build matrices, and the feature-flag service configuration.

**Clears when** the candidate is unreferenced under **every** shipped platform ×
feature combination. A tool run under one configuration cannot speak about any
other: the other branch is literally absent from its AST. Flags currently off in
production but still shipped keep their code alive.

## 7. Generated code and codegen inputs — churn, or silent and destructive

Generator output (protobuf stubs, ORM migrations, API clients) plus the schemas
and templates whose only consumer is the generator.

**Detect** `DO NOT EDIT` and `<auto-generated>` headers,
`.gitattributes` `linguist-generated`, and output paths named in codegen
configuration (`buf.gen.yaml`, `codegen.yml`, `build.rs`, MSBuild targets).

**Clears when** — it does not. Both categories are excluded by policy. Editing
output is reverted by the next generator run; deleting an input removes the
source of truth. Reduce at the schema or not at all.

## 8. Tests, fixtures, benchmarks, examples — silent

Code discovered by convention: pytest functions and `conftest.py` fixtures,
JUnit annotated methods, doctests, Rust doc-tests and `examples/`, benchmark
harnesses, helpers used by exactly one test.

**Detect** by path convention (`tests/`, `test_*`, `*_test.go`, `*.spec.ts`,
`benches/`, `examples/`), annotations, and `>>>` markers in docstrings.

**Clears when** — excluded from the reachability query entirely. Production
reachability is the wrong question here: test code is *supposed* to have no
production caller. A genuinely dead test is one that asserts nothing or is
unconditionally skipped, decided by reading it, never by a caller count.

## 9. Interface and protocol conformance — loud nominally, silent structurally

A member satisfies a contract rather than a call site: `override`s,
`IDisposable.Dispose` invoked by `using`, `__enter__`/`__exit__` invoked by
`with`, structural `typing.Protocol` conformance, operator overloads and
dunders, event-handler signatures bound at registration.

**Detect** by matching the member name against a base or interface member
(`override`, `@Override`, `impl Trait for`, `@abstractmethod`), a dunder or
operator name, or a delegate signature registered with `+=` / `AddListener`.

**Clears when** the whole conformance is removed and no interface-typed consumer
remains, including reflectively (§1) and via DI (§3). Removing one method of a
nominal interface usually fails to compile; removing a structural-protocol
member fails silently at runtime.

## 10. Intentionally unused parameters — silent

Parameters imposed by a callback or override signature, and deliberately
ignored bindings.

**Detect** a leading `_`, `_unused`, `[[maybe_unused]]`, `@SuppressWarnings`,
`#pragma warning disable`, or an `eslint-disable` comment.

**Clears when** the signature is not imposed from outside. Any explicit ignore
marker is a documented author intention: treat it as a stop. Removing a
positional parameter silently shifts the remaining arguments in dynamically
typed languages.

## 11. Vendored and third-party trees — churn

`vendor/`, `node_modules/`, `third_party/`, `external/`, `Pods/`, and Unity's
`Library/`, `Packages/`, `Assets/Plugins/`.

**Clears when** — excluded by policy. The analysis is correct and the answer is
irrelevant: a vendored library legitimately ships a mostly-unused surface, and
edits are overwritten on the next install. The lever is the dependency version,
or dropping the dependency.

## 12. Code kept for a documented reason — silent and catastrophic

Rarely executed and still required: deprecated-but-supported API inside its
announced window, compatibility shims, one-shot migration code that must still
run on old data, disaster-recovery and rollback paths, security controls that
fire only under attack, error handling for rare conditions, feature-flag kill
switches.

**Detect** `@deprecated`, `[Obsolete]`, `#[deprecated]`, `DeprecationWarning`,
and comments containing `legacy`, `compat`, `migration`, `do not remove`,
`keep for`, `rollback`, `fallback`, `recovery`, plus CHANGELOG and ADR entries.

**Clears when** an explicit, dated statement says the window closed: the
deprecation expired, no old-format data remains, the control was superseded.
Even then, propose rather than delete. These are the highest-cost false
positives — silent at build time, silent in tests, and failing only on the one
day the path was written for.

## Unity and C#

Unity defeats .NET static reachability comprehensively, and its failures are
silent until play mode or a stripped player build.

- **IDE0051 and IDE0052 only examine `private` members.** "The analyzer found
  nothing" for anything `internal` or `public` means the analyzer did not look.
- **Engine-invoked methods** (`Awake`, `Start`, `Update`, `OnEnable`,
  `OnTriggerEnter`, and the rest of the MonoBehaviour message set) have no C#
  call site by design.
- **`[SerializeField]`** assigns private fields through Unity's own serializer,
  outside the C# type system, so the compiler sees an unassigned field and the
  analyzer an unread one. **`[SerializeReference]`** instantiates a class with no
  `new` expression anywhere in the codebase.
- **UnityEvent binds by method-name string.** `GetPersistentMethodName` returns
  a string: renaming or removing the method produces no compile error and the
  wiring silently disappears.
- **Scenes and prefabs reference scripts by `.meta` GUID, never by class name.**
  A `MonoBehaviour` attached to hundreds of prefabs looks entirely unreferenced
  in C#. Grep the GUID, not the identifier.
- **Managed code stripping analyzes only build-time code**, which is why
  `[Preserve]` and `link.xml` exist. Stripping failures surface as null
  reference exceptions, missing types, or crashes in the Player.

**Clears when** all of the following hold: the name is not a MonoBehaviour
message; no engine-invocation attribute is present (`[SerializeField]`,
`[SerializeReference]`, `[RuntimeInitializeOnLoadMethod]`, `[InitializeOnLoad]`,
`[MenuItem]`, `[ContextMenu]`, `[Preserve]`); no engine-invoked interface such as
`ISerializationCallbackReceiver` is implemented; a whole-tree text search across
`.cs`, `.unity`, `.prefab`, `.asset`, `.controller`, `.anim`, `.playable`,
`.mat`, `.shader`, `.inputactions`, and `ProjectSettings/` finds nothing; the
type's `.meta` GUID appears in no serialized asset; no matching string literal
exists for `SendMessage`, `Invoke`, `StartCoroutine`, Animation Events,
`Resources.Load`, or Addressables keys; no `link.xml` entry or suppression
names it; it is unreferenced under every shipped platform define set; anything
`public` in an `.asmdef` came back empty across runtime, Editor, and test
assemblies; and a player build at the project's real stripping level succeeds
**and the affected content was exercised in a run**. Play mode and a stripped
build are not substitutes for each other.

## Master table

| Class | Detect | Cleared by | Failure |
| --- | --- | --- | --- |
| Reflection (§1) | `getattr(`, `importlib`, `Class.forName`, `Type.GetType`, `obj[name]`, `.send(` + symbol as string | No literal or computed name resolves to it | Silent |
| External entry points (§2) | Packaging manifests, Dockerfile, CI, k8s, Terraform, crontab, route/task decorators | Unreachable from a written-down root set incl. deploy config | Silent |
| DI / IoC (§3) | `AddScoped`, `@Component`, `bind<`, `Depends(`, assembly scans | Not registered, not scanned, not in a config table | Silent |
| Public API (§4) | `exports`, `__all__`, `pub`, `.d.ts`, publish step | Closed world proven, or deprecation cycle completed | Silent here, loud downstream |
| Serialization / schema (§5) | Name in `*.json/yaml/proto/sql`, templates, i18n, migrations | Migration story for already-written data | Silent, data corruption |
| Conditional compilation (§6) | `#[cfg]`, `#if`, `[features]`, `DefineConstants`, CI matrix | Unreferenced under every shipped combination | Loud elsewhere, later |
| Generated code (§7) | `DO NOT EDIT`, `linguist-generated`, codegen config | Excluded by policy | Churn, or silent and destructive |
| Tests and examples (§8) | `tests/`, `conftest.py`, `benches/`, `examples/`, `>>>` | Excluded from the reachability query | Silent, lost coverage |
| Conformance (§9) | `override`, `impl Trait for`, `@abstractmethod`, dunders | Whole conformance removed, no interface-typed consumer | Loud nominal, silent structural |
| Unused parameters (§10) | `_` prefix, `[[maybe_unused]]`, disable comments | Signature not imposed by a contract | Silent |
| Vendored trees (§11) | `vendor/`, `node_modules/`, `Packages/`, lockfiles | Excluded by policy | Churn |
| Documented reason (§12) | `@deprecated`, `[Obsolete]`, `legacy`, `rollback`, CHANGELOG, ADR | Dated statement that the window closed | Silent and catastrophic |
| Unity engine wiring | `.meta` GUID, `[SerializeField]`, UnityEvent, messages, `link.xml` | The ten-point list above, in full | Silent, at play time |

Silent failures deserve a higher evidence bar than loud ones: a broken build
costs one cycle, while a deleted migration path costs an incident whose cause
is no longer traceable to the audit.

Primary sources for every mechanism above:
[`doc/dead-code-and-slop/false-positives.md`](../../../doc/dead-code-and-slop/false-positives.md)
and [`unity-and-csharp.md`](../../../doc/dead-code-and-slop/unity-and-csharp.md).
