import './style.css'; // load tailwind
import {render} from "inferno";
import { HelmetProvider } from 'inferno-helmet';
import App from "./app/App";

render(
<HelmetProvider>
    <App />
</HelmetProvider>, document.getElementById("root"));
