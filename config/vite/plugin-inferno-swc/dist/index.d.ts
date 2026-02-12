import { JscTarget, Options, ParserConfig } from "@swc/core";
import { Plugin } from "vite";

//#region src/index.d.ts
type Options$1 = {
  /**
  * Control where the JSX factory is imported from.
  * @default "inferno"
  */
  jsxImportSource?: string;
  /**
  * Enable TypeScript decorators. Requires experimentalDecorators in tsconfig.
  * @default false
  */
  tsDecorators?: boolean;
  /**
  * Options passed to swc-plugin-inferno.
  */
  infernoPluginOptions?: InfernoPluginOptions;
  /**
  * Enable Fast Refresh in dev.
  * @default true
  */
  hmr?: boolean;
  /**
  * Options passed to @swc/plugin-prefresh.
  */
  prefreshOptions?: Record<string, any>;
  /**
  * Additional SWC plugins appended after swc-plugin-inferno.
  */
  plugins?: [string, Record<string, any>][];
  /**
  * Set the target for SWC in dev.
  * @default "es2020"
  */
  devTarget?: JscTarget;
  /**
  * Override the default include list (.ts, .tsx, .mts, .jsx, .mdx).
  */
  parserConfig?: (id: string) => ParserConfig | undefined;
  /**
  * Escape hatch to mutate SWC options.
  */
  useAtYourOwnRisk_mutateSwcOptions?: (options: Options) => void;
  /**
  * Mutate SWC options with context for safe customization.
  */
  mutateSwcOptions?: (options: Options, ctx: {
    id: string;
    ssr: boolean;
    isDev: boolean;
    refresh: boolean;
  }) => void;
  /**
  * Configure the dev transform cache.
  * @default { maxEntries: 200 }
  */
  devCache?: boolean | {
    maxEntries?: number;
  };
  /**
  * Hash algorithm for dev cache keys.
  * @default "sha1"
  */
  devCacheHash?: "sha1" | "fast";
  /**
  * Extra query suffixes to skip (e.g. init, import, direct).
  * @default ['init','import','direct']
  */
  extraQuerySkips?: string[];
  /**
  * Runtime injection strategy for MPA.
  * @default "all-html"
  */
  injectRuntime?: "all-html" | "index-only";
  /**
  * Enable debug logging.
  */
  debug?: boolean | {
    scope?: Array<"hmr" | "cache" | "swc" | "config" | "metrics">;
  };
};
interface InfernoPluginOptions {
  development?: boolean;
  production?: boolean;
  pragma?: string;
  pragmaFrag?: string;
  importSource?: string;
  runtime?: "automatic" | "classic";
  [key: string]: unknown;
}
declare const inferno: (_options?: Options$1) => Plugin[];
declare function pluginForCjs(this: unknown, options: Options$1): Plugin[];
//#endregion
export { InfernoPluginOptions, inferno as default, pluginForCjs as "module.exports" };