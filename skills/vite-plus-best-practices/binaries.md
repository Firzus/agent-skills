# Running Binaries

Three commands for executing binaries. Pick based on where the binary lives.

| Command | Resolution | Use when |
|---------|------------|----------|
| `vpx <pkg>` | Local first, downloads if missing | The general-purpose default |
| `vp exec <cmd>` | **Only** `node_modules/.bin` | Must use the version from the current project |
| `vp dlx <pkg>` | Always downloads, never installs | One-off remote tools |

## vpx

```bash
vpx <pkg[@version]> [args...]
```

Behavior:
- Bare `vpx eslint .` → resolves locally first, downloads if not installed
- `vpx pkg@version`, `vpx -p extra-pkg`, and `vpx -c '<shell>'` all force the `vp dlx` path

### Options

- `-p, --package <pkg>` — install one or more extra packages before running
- `-c, --shell-mode` — execute the command inside a shell
- `-s, --silent` — suppress Vite+ output, only show command output

### Examples

```bash
vpx eslint .
vpx create-vue my-app
vpx typescript@5.5.4 tsc --version
vpx -p cowsay -c 'echo "hi" | cowsay'
```

## vp exec

Use when the binary **must** come from the current project's `node_modules/.bin`.

```bash
vp exec eslint .
vp exec tsc --noEmit
```

If the binary is not installed locally, `vp exec` fails — there is no fallback to a downloaded copy. This is the right command in CI when you want to guarantee the pinned version is used.

## vp dlx

One-off package execution. Never adds the package to your project.

```bash
vp dlx create-vite
vp dlx typescript tsc --version
```

Useful for scaffolding tools and one-shot CLIs you do not want polluting `package.json`.
