import "./index.css";
import App from "./App.tsx";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { KeycloakAuthProvider } from "./providers/KeycloakAuthProvider.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <KeycloakAuthProvider>
      <App />
    </KeycloakAuthProvider>
  </StrictMode>
);
