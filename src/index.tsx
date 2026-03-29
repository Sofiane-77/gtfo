import "./style.css"; // load tailwind
import { render } from "inferno";
import { HelmetProvider } from "inferno-helmet";
import App from "./app/App";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing #root container");
}

// Clear SEO shell content before client render to avoid mixed DOM.
root.replaceChildren();

render(
  <HelmetProvider>
    <App />
  </HelmetProvider>,
  root,
);
