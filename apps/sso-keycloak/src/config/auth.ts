import type { AuthProviderProps } from "react-oidc-context";
import { WebStorageStateStore } from "oidc-client-ts";

const oidcConfig: AuthProviderProps = {
  authority: `${import.meta.env.VITE_KEYCLOAK_URL}/realms/${
    import.meta.env.VITE_KEYCLOAK_REALM
  }`,
  client_id: import.meta.env.VITE_CLIENT_ID || "tnv",
  redirect_uri: window.location.origin,
  userStore: new WebStorageStateStore({
    store: window.localStorage,
  }),
  onSigninCallback: () => {
    // Xóa các parameters sau khi login
    window.history.replaceState({}, document.title, window.location.pathname);
  },
  loadUserInfo: true,
};

export default oidcConfig;
