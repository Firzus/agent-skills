# Upgrading Vite+

There are two parts to upgrade independently:

1. The global `vp` binary
2. The local `vite-plus` package inside the project

## Upgrade Global `vp`

```bash
vp upgrade
```

## Upgrade Local `vite-plus`

```bash
vp update vite-plus
# or pin to latest explicitly
vp add vite-plus@latest
```

## ⚠️ Aliased Packages

During install, Vite+ rewires npm aliases:

- `vite` → `npm:@voidzero-dev/vite-plus-core@latest`
- `vitest` → `npm:@voidzero-dev/vite-plus-test@latest`

**`vp update vite-plus` does not re-resolve these aliases in the lockfile.** A full upgrade also needs:

```bash
vp update @voidzero-dev/vite-plus-core @voidzero-dev/vite-plus-test
```

Combined one-liner:

```bash
vp update vite-plus @voidzero-dev/vite-plus-core @voidzero-dev/vite-plus-test
```

Verify nothing is left behind:

```bash
vp outdated
```

## Uninstall

```bash
vp implode
```

Removes `vp` and Vite+ data from the machine. Useful when switching back to standalone Vite or to a clean reinstall.
