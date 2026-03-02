import "./index.css";
import { createRoot } from "react-dom/client";

import App from "./App.tsx";
import { KeycloakAuthProvider } from "./providers/KeycloakAuthProvider.tsx";
import "./i18n";

createRoot(document.getElementById("root")!).render(
  <KeycloakAuthProvider>
    <App />
  </KeycloakAuthProvider>,
);
