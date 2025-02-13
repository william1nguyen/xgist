import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "react-oidc-context";
import oidcConfig from "./config/auth";
import App from "./App";

const root = document.getElementById("root");
if (root) {
    createRoot(root).render(
        <StrictMode>
            <AuthProvider {...oidcConfig}>
                <App />
            </AuthProvider>
        </StrictMode>
    );
}
