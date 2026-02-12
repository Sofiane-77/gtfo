import { render } from "inferno";
import { App } from "./App.tsx";

new Worker(new URL("./worker-via-url.ts", import.meta.url), { type: "module" });

const root = document.getElementById("app");
if (root) {
  render(<App />, root);
}
