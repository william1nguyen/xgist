import { useAuth } from "react-oidc-context";

export const useKeycloakAuth = () => {
  const auth = useAuth();

  return {
    isAuthenticated: auth.isAuthenticated,
    user: auth.user,
    isLoading: auth.isLoading,
    login: () => auth.signinRedirect(),
    logout: () => auth.removeUser(),
  };
};
