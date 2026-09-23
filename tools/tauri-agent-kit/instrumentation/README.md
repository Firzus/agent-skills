# tauri-agent-kit-instrumentation

Optional IPC timing metadata for tauri-agent-kit. MIT licensed; alpha software.

```typescript
import { instrumentInvoke } from "tauri-agent-kit-instrumentation";

export const invoke = instrumentInvoke();
```

Requires `@tauri-apps/api` 2.11+ and the `tauri-plugin-agent-kit` plugin. Grant `agent-kit:allow-record-ipc` to only the reporting WebViews. Enable the Rust plugin explicitly in a debug build.

Wrap an existing invoke function with `instrumentInvoke(existingInvoke)`. Arguments, results and errors are preserved. Only command name, duration and outcome are reported; reporting failures never change application results. Calls outside the wrapper are not instrumented.

[Project documentation](https://github.com/Firzus/agent-skills/tree/main/tools/tauri-agent-kit).
