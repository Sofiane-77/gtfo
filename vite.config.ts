import {defineConfig, type PluginOption} from "vite";
import inferno from "@vitejs/plugin-inferno-swc";
import path from "path";

export default defineConfig(({command}) => {
  const isBuild = command === "build";

  return {
    plugins: inferno({
      infernoPluginOptions: {
        runtime: "classic",
        pragma: "Inferno.createElement",
        pragmaFrag: "Inferno.Fragment",
        development: !isBuild,
        production: isBuild
      },
      hmr: true
    }) as unknown as PluginOption[],
    resolve: {
      alias: [{
        find: "src",
        replacement: path.resolve(__dirname, "./src")
      }]
    },
    define: {
      "process.env.NODE_ENV": JSON.stringify(isBuild ? "production" : "development")
    },
    build: {
      target: "es2022",
      cssTarget: "chrome107"
    },
    server: {
      port: 5110,
      allowedHosts: true
    },
    base: isBuild ? "/gtfo/" : "/",
  };
});
