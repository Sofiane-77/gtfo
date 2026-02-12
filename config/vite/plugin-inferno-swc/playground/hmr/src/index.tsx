import { render } from "inferno";
import { App } from "./App.tsx";
import "./index.css";

const root = document.getElementById("app");
if (root) {
  render(<App />, root);
}
