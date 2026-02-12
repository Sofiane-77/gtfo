# @vitejs/plugin-inferno-swc

Speed up your Vite dev server with SWC and Inferno.

- Fast dev transforms via SWC
- Automatic JSX runtime

## Installation

```sh
npm i -D @vitejs/plugin-inferno-swc
```

## Usage

```ts
import { defineConfig } from 'vite'
import inferno from '@vitejs/plugin-inferno-swc'

export default defineConfig({
  plugins: [inferno()],
})
```

## Caveats

This plugin keeps the same performance-driven constraints as the React SWC plugin:

- `useDefineForClassFields` is always enabled to match the current ECMAScript spec
- JSX runtime is always `automatic`
- JSX/TSX is transformed exclusively by `swc-plugin-inferno` (no SWC React transform, no React JSX runtime).
- In development:
  - esbuild is disabled to avoid double-transpiling JSX (SWC handles it)
  - `target` is ignored and defaults to `es2020` (see `devTarget`)
  - JS files are not transformed
  - tsconfig is not resolved, so TypeScript options other than those above use TS defaults
- Fast Refresh in dev uses `@swc/plugin-prefresh` plus an embedded runtime powered by `@prefresh/core` and is disabled for SSR.
- In build, only `swc-plugin-inferno` runs (no prefresh injection).
- SWC plugin versions are pinned for stability and reproducible builds.

## How It Works

- Dev: SWC runs with `swc-plugin-inferno`. If HMR is enabled, `@swc/plugin-prefresh` runs before it and the refresh runtime is injected.
- Build: SWC runs with `swc-plugin-inferno` only (no prefresh injection).
- SSR: Refresh runtime injection is skipped and prefresh is disabled.

## Compatibility

| Package | Version |
| --- | --- |
| Vite | `^4 \|\| ^5 \|\| ^6 \|\| ^7` |
| Inferno | any recent version (user-provided) |
| @swc/core | ^1.15.11 |
| @swc/plugin-prefresh | 12.5.0 |
| swc-plugin-inferno | 2.13.0 |

## TypeScript

For type checking, set `jsxImportSource: "inferno"` in your `tsconfig`:

```jsonc
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "inferno"
  }
}
```

## Options

### jsxImportSource

Control where the JSX factory is imported from.

This value is forwarded to `swc-plugin-inferno` as `importSource` unless it is
explicitly set in `infernoPluginOptions`.

`@default` "inferno"

```ts
inferno({ jsxImportSource: 'inferno' })
```

### tsDecorators

Enable TypeScript decorators. Requires `experimentalDecorators` in tsconfig.

`@default` false

```ts
inferno({ tsDecorators: true })
```

### infernoPluginOptions

Options passed to `swc-plugin-inferno`.

`@default` {}

Supported fields include:

- `development?: boolean`
- `production?: boolean`
- `pragma?: string`
- `pragmaFrag?: string`
- `importSource?: string`
- `runtime?: 'automatic' | 'classic'`

```ts
inferno({ infernoPluginOptions: { production: false } })
```

### hmr

Enable HMR via `@swc/plugin-prefresh` in dev.

`@default` true

```ts
inferno({ hmr: true })
```

### prefreshOptions

Options passed to `@swc/plugin-prefresh`.

`@default` {}

```ts
inferno({ prefreshOptions: { } })
```

### injectRuntime

Control refresh runtime injection for multi-page apps.

`@default` "all-html"

```ts
inferno({ injectRuntime: 'all-html' })
inferno({ injectRuntime: 'index-only' })
```

### extraQuerySkips

Additional query suffixes to skip (always skipped: `raw`, `url`, `worker`, `sharedworker`, `inline`).

`@default` ['init', 'import', 'direct']

```ts
inferno({ extraQuerySkips: ['init', 'import', 'direct', 'foo'] })
```

### plugins

Additional SWC plugins (appended after `swc-plugin-inferno`).

```ts
inferno({ plugins: [['@swc/plugin-styled-components', {}]] })
```

### devTarget

Set the target for SWC in dev. This can avoid down-transpiling private class methods.

For production target, see <https://vite.dev/config/build-options.html#build-target>.

`@default` "es2020"

```ts
inferno({ devTarget: 'es2022' })
```

### parserConfig

Override the default include list (.ts, .tsx, .mts, .cts, .jsx, .mjsx, .mdx).

This requires redefining the config for any file you want to be included. Exclusion of
node_modules should be handled by the function if needed.

```ts
inferno({
  parserConfig(id) {
    if (id.endsWith('.res')) return { syntax: 'ecmascript', jsx: true }
    if (id.endsWith('.ts')) return { syntax: 'typescript', tsx: false }
  },
})
```

### useAtYourOwnRisk_mutateSwcOptions

Escape hatch to mutate the SWC options before transform.

```ts
inferno({
  useAtYourOwnRisk_mutateSwcOptions(options) {
    options.jsc.parser.decorators = true
  },
})
```

### devCache

Configure the dev-only transform cache.

`@default` `{ maxEntries: 200 }`

```ts
inferno({ devCache: true })
inferno({ devCache: false })
inferno({ devCache: { maxEntries: 400 } })
```

### devCacheHash

Select the hash algorithm used for dev cache keys.

`@default` "sha1"

```ts
inferno({ devCacheHash: 'sha1' })
inferno({ devCacheHash: 'fast' })
```

### mutateSwcOptions

Safely mutate SWC options with context.

```ts
inferno({
  mutateSwcOptions(options, ctx) {
    if (ctx.isDev && ctx.refresh) {
      options.jsc.target = 'es2022'
    }
  },
})
```

### debug

Enable debug logging (optional scopes: `hmr`, `cache`, `swc`, `config`, `metrics`).

The `swc` scope logs which files are transformed.

```ts
inferno({ debug: true })
inferno({ debug: { scope: ['metrics', 'cache'] } })
```

## Troubleshooting

- Fast Refresh not working: ensure `@prefresh/core` is installed and `hmr` is not disabled.
- No JSX types: set `jsxImportSource: "inferno"` in `tsconfig`.
- Unexpected full reloads: check for skipped query imports or SSR mode.
- Refresh disabled in SSR: this is expected; refresh is dev-only.
