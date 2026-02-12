import { render } from "inferno";
import App from "./app";

const root = document.getElementById("app");
if (root) {
  render(<App />, root);
}
