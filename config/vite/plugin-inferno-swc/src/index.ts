import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import {
  type JscTarget,
  type Output,
  type ParserConfig,
  type Options as SWCOptions,
  transform,
} from '@swc/core'
import { silenceUseClientWarning } from './warning.ts'
import type { Plugin } from 'vite'
import * as vite from 'vite'

const require = createRequire(import.meta.url)
const resolve = require.resolve
const DEV_CACHE_MAX_ENTRIES = 200
const DEV_CACHE_MAX_CODE_SIZE = 200_000

const getSwcCacheRoot = (
  cacheRoot: string | undefined,
  root: string | undefined,
) => {
  const base = cacheRoot ?? 'node_modules/.vite'
  const rootKey = root ?? process.cwd()
  const suffix = createHash('sha1').update(rootKey).digest('hex').slice(0, 8)
  return join(base, `.swc-${suffix}`)
}

type Options = {
  /**
   * Control where the JSX factory is imported from.
   * @default "inferno"
   */
  jsxImportSource?: string
  /**
   * Enable TypeScript decorators. Requires experimentalDecorators in tsconfig.
   * @default false
   */
  tsDecorators?: boolean
  /**
   * Options passed to swc-plugin-inferno.
   */
  infernoPluginOptions?: InfernoPluginOptions
  /**
    * Enable Fast Refresh in dev.
   * @default true
   */
  hmr?: boolean
  /**
   * Options passed to @swc/plugin-prefresh.
   */
  prefreshOptions?: Record<string, any>
  /**
   * Additional SWC plugins appended after swc-plugin-inferno.
   */
  plugins?: [string, Record<string, any>][]
  /**
   * Set the target for SWC in dev.
   * @default "es2020"
   */
  devTarget?: JscTarget
  /**
   * Override the default include list (.ts, .tsx, .mts, .jsx, .mdx).
   */
  parserConfig?: (id: string) => ParserConfig | undefined
  /**
   * Escape hatch to mutate SWC options.
   */
  useAtYourOwnRisk_mutateSwcOptions?: (options: SWCOptions) => void
  /**
   * Mutate SWC options with context for safe customization.
   */
  mutateSwcOptions?: (
    options: SWCOptions,
    ctx: { id: string; ssr: boolean; isDev: boolean; refresh: boolean },
  ) => void
  /**
   * Configure the dev transform cache.
   * @default { maxEntries: 200 }
   */
  devCache?: boolean | { maxEntries?: number }
  /**
   * Hash algorithm for dev cache keys.
   * @default "sha1"
   */
  devCacheHash?: 'sha1' | 'fast'
  /**
   * Extra query suffixes to skip (e.g. init, import, direct).
   * @default ['init','import','direct']
   */
  extraQuerySkips?: string[]
  /**
   * Runtime injection strategy for MPA.
   * @default "all-html"
   */
  injectRuntime?: 'all-html' | 'index-only'
  /**
   * Enable debug logging.
   */
  debug?: boolean | { scope?: Array<'hmr' | 'cache' | 'swc' | 'config' | 'metrics'> }
}

export interface InfernoPluginOptions {
  development?: boolean
  production?: boolean
  pragma?: string
  pragmaFrag?: string
  importSource?: string
  runtime?: 'automatic' | 'classic'
  [key: string]: unknown
}

const inferno = (_options?: Options): Plugin[] => {
  let viteCacheRoot: string | undefined
  let viteRoot: string | undefined
  let hmrDisabled = true
  let buildSourceMaps: SWCOptions['sourceMaps'] = false
  let refreshEnabled = _options?.hmr !== false
  let buildSsr = false
  let logger: { info: (msg: string) => void; warn: (msg: string) => void } | undefined
  const prefreshRuntimeId = 'virtual:inferno-prefresh-runtime'
  const prefreshRuntimeResolvedId = `\0${prefreshRuntimeId}`
  const devTransformCache = new Map<string, { code: string; map?: Output['map'] }>()
  const debugEnabled = _options?.debug === true
  const debugScopes =
    _options?.debug && _options?.debug !== true
      ? new Set(_options.debug.scope ?? [])
      : undefined
  const injectRuntime = _options?.injectRuntime ?? 'all-html'
  const extraQuerySkips = _options?.extraQuerySkips ?? ['init', 'import', 'direct']
  const extraQueryRe =
    extraQuerySkips.length > 0
      ? new RegExp(
          `[?&](${extraQuerySkips
            .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join('|')})(?:&|$)`,
        )
      : null
  let transformCount = 0
  let cacheHits = 0
  let totalSwcTimeMs = 0

  const prefreshRuntimeCode = `import * as prefresh from '@prefresh/core'

const runtime = prefresh.setup ? prefresh.setup() : prefresh
const globalObj = typeof self !== 'undefined' ? self : globalThis
const register = runtime.register ?? prefresh.register ?? (() => {})
const signature = runtime.signature ?? prefresh.signature ?? (() => (type) => type)

globalObj.__PREFRESH__ = runtime
globalObj.$RefreshReg$ = register
globalObj.$RefreshSig$ = signature

const init = prefresh.init ?? runtime.init
if (init) init()

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    try {
      const flush = runtime.flush ?? prefresh.flush
      if (flush) flush()
    } catch (error) {
      import.meta.hot.invalidate()
    }
  })
}
`

  const infernoPluginOptions = { ...(_options?.infernoPluginOptions ?? {}) }
  if (_options?.jsxImportSource && infernoPluginOptions.importSource === undefined) {
    infernoPluginOptions.importSource = _options.jsxImportSource
  }
  const infernoPlugin = [
    resolve('swc-plugin-inferno'),
    infernoPluginOptions,
  ] as [string, Record<string, any>]
  const prefreshPlugin = refreshEnabled
    ? ([
        resolve('@swc/plugin-prefresh'),
        _options?.prefreshOptions ?? {},
      ] as [string, Record<string, any>])
    : undefined
  const extraPlugins = _options?.plugins
    ? _options.plugins.map((el, index): typeof el => {
        if (!Array.isArray(el) || el.length !== 2) {
          throw new Error(
            `[vite:inferno-swc] Invalid SWC plugin at index ${index}. Expected [string, object].`,
          )
        }
        const [name, config] = el
        if (typeof name !== 'string' || !config || typeof config !== 'object') {
          throw new Error(
            `[vite:inferno-swc] Invalid SWC plugin at index ${index}. Expected [string, object].`,
          )
        }
        try {
          return [resolve(name), config]
        } catch {
          throw new Error(
            `[vite:inferno-swc] Failed to resolve SWC plugin "${name}".`,
          )
        }
      })
    : []

  const options = {
    jsxImportSource: _options?.jsxImportSource ?? 'inferno',
    tsDecorators: _options?.tsDecorators,
    plugins: [infernoPlugin, ...extraPlugins],
    devTarget: _options?.devTarget ?? 'es2020',
    parserConfig: _options?.parserConfig,
    useAtYourOwnRisk_mutateSwcOptions:
      _options?.useAtYourOwnRisk_mutateSwcOptions,
    mutateSwcOptions: _options?.mutateSwcOptions,
  }

  const hasSpecialQuery = (id: string) =>
    /[?&](raw|url|worker|sharedworker|inline)(?:&|$)/.test(id)

  const hasExtraQuery = (id: string) => (extraQueryRe ? extraQueryRe.test(id) : false)

  const isVirtualModule = (id: string) =>
    id.startsWith('\0') || id.startsWith('virtual:')

  const normalizeSourceMaps = (
    value: boolean | 'inline' | 'hidden' | undefined,
  ): SWCOptions['sourceMaps'] => {
    if (value === 'inline') return 'inline'
    if (value === 'hidden') return true
    return value ?? false
  }

  const getDevCacheMaxEntries = (): number | false => {
    if (_options?.devCache === false) return false
    if (_options?.devCache === true || _options?.devCache === undefined) {
      return DEV_CACHE_MAX_ENTRIES
    }
    return _options.devCache.maxEntries ?? DEV_CACHE_MAX_ENTRIES
  }

  const getDevCacheHash = (): 'sha1' | 'fast' => _options?.devCacheHash ?? 'sha1'

  const hashCodeFast = (input: string): string => {
    let hash = 0x811c9dc5
    for (let i = 0; i < input.length; i += 1) {
      hash ^= input.charCodeAt(i)
      hash = (hash +
        ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>
        0
    }
    return (hash >>> 0).toString(16).padStart(8, '0')
  }

  const hashCode = (input: string): string =>
    getDevCacheHash() === 'fast'
      ? hashCodeFast(input)
      : createHash('sha1').update(input).digest('hex')

  const shouldDebug = (scope: 'hmr' | 'cache' | 'swc' | 'config' | 'metrics') =>
    debugEnabled || (debugScopes ? debugScopes.has(scope) : false)

  const logDebug = (
    logger: { info: (msg: string) => void },
    scope: 'hmr' | 'cache' | 'swc' | 'config' | 'metrics',
    message: string,
  ) => {
    if (!shouldDebug(scope)) return
    logger.info(`[vite:inferno-swc] ${message}`)
  }

  const getParserInfo = (
    id: string,
  ): { parser: ParserConfig; kind: string } | null => {
    const decorators = options?.tsDecorators ?? false
    const customParser = options.parserConfig ? options.parserConfig(id) : undefined
    if (customParser) {
      const kind =
        customParser.syntax === 'typescript'
          ? customParser.tsx
            ? 'tsx'
            : 'ts'
          : customParser.jsx
            ? 'jsx'
            : 'js'
      return { parser: customParser, kind: `custom:${kind}` }
    }

    if (id.endsWith('.tsx')) {
      return { parser: { syntax: 'typescript', tsx: true, decorators }, kind: 'tsx' }
    }
    if (id.endsWith('.ts') || id.endsWith('.mts') || id.endsWith('.cts')) {
      return { parser: { syntax: 'typescript', tsx: false, decorators }, kind: 'ts' }
    }
    if (id.endsWith('.jsx') || id.endsWith('.mjsx')) {
      return { parser: { syntax: 'ecmascript', jsx: true }, kind: 'jsx' }
    }
    if (id.endsWith('.mdx')) {
      return { parser: { syntax: 'ecmascript', jsx: true }, kind: 'mdx' }
    }
    return null
  }

  return [
    {
      name: 'vite:inferno-swc:serve',
      apply: 'serve',
      config: () => ({
        esbuild: false,
        // NOTE: oxc option only exists in rolldown-vite
        oxc: false,
        optimizeDeps: {
          include: refreshEnabled ? ['@prefresh/core'] : [],
          ...('rolldownVersion' in vite
            ? {
                rolldownOptions: {
                  transform: { jsx: { runtime: 'automatic' } },
                },
              }
            : { esbuildOptions: { jsx: 'automatic' } }),
        },
      }),
      configResolved(config) {
        viteCacheRoot = config.cacheDir
        viteRoot = config.root
        hmrDisabled = config.server.hmr === false
        logger = config.logger
        const mdxIndex = config.plugins.findIndex(
          (p) => p.name === '@mdx-js/rollup',
        )
        if (
          mdxIndex !== -1 &&
          mdxIndex >
            config.plugins.findIndex((p) =>
              p.name.startsWith('vite:inferno-swc'),
            )
        ) {
          throw new Error(
            '[vite:inferno-swc] The MDX plugin should be placed before this plugin',
          )
        }
        const serverSsr = !!(config.server as { ssr?: boolean }).ssr
        logDebug(
          config.logger,
          'config',
          `mode=serve ssr=${serverSsr ? 'on' : 'off'} refresh=${
            refreshEnabled && !hmrDisabled
              ? 'on'
              : 'off'
          } swcPlugins=${
            refreshEnabled
              ? '@swc/plugin-prefresh > swc-plugin-inferno'
              : 'swc-plugin-inferno'
          } devCache=${
            getDevCacheMaxEntries() === false
              ? 'off'
              : `on:${getDevCacheMaxEntries()}`
          } injectRuntime=${injectRuntime}`,
        )
      },
      resolveId(id) {
        if (id === prefreshRuntimeId) return prefreshRuntimeResolvedId
        return null
      },
      load(id) {
        if (id === prefreshRuntimeResolvedId) return prefreshRuntimeCode
        return null
      },
      transformIndexHtml(_, config) {
        if (!refreshEnabled || hmrDisabled) return
        if (config.server?.config.ssr) return
        if (injectRuntime === 'index-only') {
          const path = config.path ?? ''
          const isIndex = path === '/' || path.endsWith('/index.html')
          if (!isIndex) return
        }
        return [
          {
            tag: 'script',
            attrs: { type: 'module' },
            children: `import "${prefreshRuntimeId}";`,
          },
        ]
      },
      configureServer(server) {
        if (!shouldDebug('metrics')) return
        server.httpServer?.once('close', () => {
          const hitRate = transformCount
            ? ((cacheHits / transformCount) * 100).toFixed(1)
            : '0.0'
          server.config.logger.info(
            `[vite:inferno-swc] metrics transforms=${transformCount} cacheHitRate=${hitRate}% swcMs=${Math.round(
              totalSwcTimeMs,
            )}`,
          )
        })
      },
      transform: {
        async handler(code, _id, transformOptions) {
          if (isVirtualModule(_id)) return null
          if (hasSpecialQuery(_id) || hasExtraQuery(_id)) return null
          const id = _id.split('?')[0]
          const parserInfo = getParserInfo(id)
          if (!parserInfo) return null
          // Refresh is dev-only and disabled for SSR.
          const enableRefresh =
            refreshEnabled &&
            !hmrDisabled &&
            !transformOptions?.ssr
          const swcPlugins = enableRefresh
            ? [prefreshPlugin!, ...options.plugins]
            : options.plugins
          const cacheable = code.length <= DEV_CACHE_MAX_CODE_SIZE
          const maxEntries = getDevCacheMaxEntries()
          let cacheKey: string | undefined
          if (cacheable && maxEntries !== false) {
            const codeHash = hashCode(code)
            cacheKey = `${id}\0${codeHash}\0${code.length}\0${
              transformOptions?.ssr ? 'ssr' : 'client'
            }\0${enableRefresh ? 'refresh' : 'norefresh'}\0${parserInfo.kind}`
            const cached = devTransformCache.get(cacheKey)
            if (cached) {
              devTransformCache.delete(cacheKey)
              devTransformCache.set(cacheKey, cached)
              cacheHits += 1
              return cached
            }
          }
          if (logger) {
            logDebug(
              logger,
              'swc',
              `transform ${id} ssr=${transformOptions?.ssr ? 'on' : 'off'} refresh=${
                enableRefresh ? 'on' : 'off'
              }`,
            )
          }
          const start = shouldDebug('metrics') ? Date.now() : 0
          return transformWithOptions(
            id,
            code,
            options.devTarget,
            options,
            swcPlugins,
            viteCacheRoot,
            viteRoot,
            true,
            parserInfo,
            {
              id,
              ssr: !!transformOptions?.ssr,
              isDev: true,
              refresh: enableRefresh,
            },
          ).then((result) => {
            if (shouldDebug('metrics')) {
              transformCount += 1
              totalSwcTimeMs += Date.now() - start
              if (transformCount % 100 === 0 && logger) {
                const hitRate = transformCount
                  ? ((cacheHits / transformCount) * 100).toFixed(1)
                  : '0.0'
                logDebug(
                  logger,
                  'metrics',
                  `metrics transforms=${transformCount} cacheHitRate=${hitRate}% swcMs=${Math.round(
                    totalSwcTimeMs,
                  )}`,
                )
              }
            }
            if (result && cacheable && maxEntries !== false && cacheKey) {
              devTransformCache.set(cacheKey, result)
              while (devTransformCache.size > maxEntries) {
                const firstKey = devTransformCache.keys().next().value
                if (!firstKey) break
                devTransformCache.delete(firstKey)
              }
            }
            return result
          })
        },
      },
    },
    {
      name: 'vite:inferno-swc:build',
      apply: 'build',
      enforce: 'pre',
      config: (userConfig) => ({
        build: silenceUseClientWarning(userConfig),
      }),
      configResolved(config) {
        viteCacheRoot = config.cacheDir
        viteRoot = config.root
        buildSourceMaps = normalizeSourceMaps(config.build.sourcemap)
        buildSsr = !!config.build.ssr
        logger = config.logger
        logDebug(
          config.logger,
          'config',
          `mode=build ssr=${buildSsr ? 'on' : 'off'} refresh=off swcPlugins=swc-plugin-inferno devCache=off injectRuntime=${injectRuntime}`,
        )
      },
      transform: (code, _id) => {
        if (isVirtualModule(_id)) return null
        if (hasSpecialQuery(_id) || hasExtraQuery(_id)) return null
        const id = _id.split('?')[0]
        const parserInfo = getParserInfo(id)
        if (!parserInfo) return null
        if (logger) {
          logDebug(logger, 'swc', `transform ${id} ssr=${buildSsr ? 'on' : 'off'}`)
        }
        return transformWithOptions(
          id,
          code,
          'esnext',
          options,
          options.plugins,
          viteCacheRoot,
          viteRoot,
          buildSourceMaps,
          parserInfo,
          { id, ssr: buildSsr, isDev: false, refresh: false },
        )
      },
    },
  ]
}

const transformWithOptions = async (
  id: string,
  code: string,
  target: JscTarget,
  options: Options,
  plugins: [string, Record<string, any>][],
  viteCacheRoot: string | undefined,
  viteRoot: string | undefined,
  sourceMaps: SWCOptions['sourceMaps'],
  parserInfo: { parser: ParserConfig; kind: string },
  ctx: { id: string; ssr: boolean; isDev: boolean; refresh: boolean },
) => {
  let result: Output
  try {
    const swcOptions: SWCOptions = {
      filename: id,
      swcrc: false,
      configFile: false,
      sourceMaps,
      jsc: {
        target,
        parser: parserInfo.parser,
        experimental: {
          plugins,
          cacheRoot: getSwcCacheRoot(viteCacheRoot, viteRoot),
        },
        transform: {
          useDefineForClassFields: true,
        },
      },
    }
    if (options.useAtYourOwnRisk_mutateSwcOptions) {
      options.useAtYourOwnRisk_mutateSwcOptions(swcOptions)
    }
    if (options.mutateSwcOptions) {
      options.mutateSwcOptions(swcOptions, ctx)
    }
    result = await transform(code, swcOptions)
  } catch (e: any) {
    const message: string = e.message
    const fileStartIndex = message.indexOf('╭─[')
    if (fileStartIndex !== -1) {
      const match = message.slice(fileStartIndex).match(/:(\d+):(\d+)\]/)
      if (match) {
        e.line = match[1]
        e.column = match[2]
      }
    }
    throw e
  }

  return { code: result.code, map: result.map }
}

export default inferno

// Compat for require
function pluginForCjs(this: unknown, options: Options): Plugin[] {
  return inferno.call(this, options)
}
Object.assign(pluginForCjs, {
  default: pluginForCjs,
})
export { pluginForCjs as 'module.exports' }
