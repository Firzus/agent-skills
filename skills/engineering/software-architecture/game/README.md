# Game Runtime Patterns — index

Backbone: Robert Nystrom, _Game Programming Patterns_
(https://gameprogrammingpatterns.com/contents.html). Start with
[architecture-principles.md](./architecture-principles.md) to decide *how hard*
to architect, then open the pattern file matching your problem.

| File | Covers |
| --- | --- |
| [architecture-principles.md](./architecture-principles.md) | The decoupling vs simplicity vs speed trade-off, the decoupling spectrum, behavior-modeling ladder, globals, GameObject → Component → ECS → DOD, when a pattern hurts |
| [sequencing.md](./sequencing.md) | Game Loop, Update Method, Double Buffer — the nucleus of most engines |
| [design-patterns-revisited.md](./design-patterns-revisited.md) | GoF re-examined for games: Command, Flyweight, Observer, Prototype, Singleton, State |
| [behavioral.md](./behavioral.md) | Bytecode, Subclass Sandbox, Type Object — behavior authored as data |
| [decoupling.md](./decoupling.md) | Component, Event Queue, Service Locator |
| [optimization.md](./optimization.md) | Data Locality, Dirty Flag, Object Pool, Spatial Partition — profiler-gated |
