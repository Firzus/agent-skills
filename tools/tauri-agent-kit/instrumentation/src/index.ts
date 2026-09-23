import { invoke, type InvokeArgs, type InvokeOptions } from "@tauri-apps/api/core";

export function instrumentInvoke(base: typeof invoke = invoke): typeof invoke {
  return async <T>(command: string, args?: InvokeArgs, options?: InvokeOptions): Promise<T> => {
    const started = performance.now();
    let outcome = "ok";
    try {
      return await base<T>(command, args, options);
    } catch (error) {
      outcome = "error";
      throw error;
    } finally {
      if (command !== "plugin:agent-kit|record_ipc") {
        void Promise.resolve()
          .then(() =>
            base("plugin:agent-kit|record_ipc", {
              record: { command, durationMs: performance.now() - started, outcome },
            }),
          )
          .catch(() => {});
      }
    }
  };
}
