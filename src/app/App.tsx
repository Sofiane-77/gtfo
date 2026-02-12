import { BrowserRouter } from "inferno-router";
import AppRoutes from "./routes";

export default function App() {
    return (
        <BrowserRouter>
            <AppRoutes />
        </BrowserRouter>
    );
}
