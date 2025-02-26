import "./index.css";
import App from "./App.tsx";
import { createRoot } from "react-dom/client";
import { KeycloakAuthProvider } from "./providers/KeycloakAuthProvider.tsx";

createRoot(document.getElementById("root")!).render(
  <KeycloakAuthProvider>
    <App />
  </KeycloakAuthProvider>
);
