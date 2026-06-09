# Behavioral Patterns

Patterns for defining _behavior_ — especially content authored by designers
rather than programmers.

Source: Robert Nystrom, _Game Programming Patterns_ — "Behavioral Patterns".

---

## Bytecode

- **Intent** — Give behavior the flexibility of data by encoding it as
  instructions for a virtual machine you control.
- **Problem solved** — Content (spells, abilities, AI) changes constantly;
  hardcoding it in the engine language forces recompiles and lets authored
  behavior crash the engine. You need behavior that's data-driven, sandboxed,
  and fast to iterate.
- **Solution shape**

```cpp
enum Instruction { INST_SET_HEALTH, INST_PLAY_SOUND, INST_SPAWN, /* ... */ };
// Compile authored behavior to a flat array of ops + operands;
// a stack-based VM interprets them:
while (ip < code.size())
  switch (code[ip++]) { case INST_SET_HEALTH: /* pop args, act */ break; /* ... */ }
```

- **Pitfalls / costs** — The highest-complexity pattern in the book: you're
  building a language (instruction set, compiler/assembler, often tooling and a
  debugger). Easy to over-engineer; interpretation is slower than native code.
- **When to avoid / modern alternative** — Avoid unless you have _many_
  behaviors changed frequently. Prefer an **embedded scripting language** (Lua,
  Luau, Wren, AngelScript, GDScript) or a **visual scripting graph** (Unreal
  Blueprints, Unity Visual Scripting): same data-driven sandboxing, far less
  infrastructure. Roll your own only for tight control over performance, memory,
  or sandbox safety.
- **Related** — Interpreter (easier but slower, AST-walking alternative),
  Subclass Sandbox, Type Object.

---

## Subclass Sandbox

- **Intent** — Define behavior in subclasses using a set of safe operations
  provided by a base class.
- **Problem solved** — Many similar subclasses (dozens of `Superpower`s, enemy
  types). If each reaches directly into engine systems (audio, particles,
  physics), you get duplicated coupling and a maintenance nightmare when
  subsystems change.
- **Solution shape**

```cpp
class Superpower {                          // base = the "sandbox"
protected:
  virtual void activate() = 0;              // sandbox method (subclass fills in)
  void playSound(SoundId id, float vol);    // provided operations
  void spawnParticles(ParticleType t, int n);
};
class SkyLaunch : public Superpower {
  void activate() override { playSound(SND_SPROING, 1.0f); spawnParticles(PARTICLE_DUST, 10); }
};
```

- **Pitfalls / costs** — The base class can become a god-class that accumulates
  every operation; deep hierarchies become rigid; shared base state couples
  subclasses.
- **When to avoid / modern alternative** — Avoid when behaviors vary along
  multiple independent axes (inheritance can't model that) — prefer
  **composition / Component**. For provided operations, **dependency injection**
  of small service objects is more flexible and testable. Move to
  Bytecode/scripting when _designers_ should author the behavior.
- **Related** — Update Method & Game Loop (often define sandbox methods),
  Template Method (its GoF ancestor), Component, Bytecode, Facade.

---

## Type Object

- **Intent** — Define new "types" as data (instances of a Type class) instead of
  as code (new subclasses).
- **Problem solved** — Hundreds of monster/item "kinds" differing only in data
  (health, attack, sprite). One subclass per kind means a recompile for every
  new kind and shuts designers out of authoring content.
- **Solution shape**

```cpp
class Breed { int health; std::string attack; /* ... */ public: Monster* newMonster(); };
class Monster { Breed& breed_; int curHealth_; };
// Many Monster instances share one Breed; new "types" = new Breed data rows.
```

- **Pitfalls / costs** — Type objects are tracked manually (no compiler help, no
  type checking); behavior is harder to vary than data — pure type objects
  struggle with kind-specific _logic_; the type reference adds indirection.
- **When to avoid / modern alternative** — Avoid for a small fixed set of kinds,
  or when kinds differ mainly in _behavior_. Modern equivalent: **data-driven
  config** — Unity **ScriptableObjects**, Unreal **DataAssets/DataTables**, or
  external JSON/YAML/spreadsheets loaded into definition objects. These are the
  productized Type Object: designer-editable and hot-reloadable.
- **Related** — Prototype (alternative "type-as-data" via cloning), Flyweight
  (the type object is shared intrinsic state), Component, Bytecode (for
  data-driven _behavior_).
