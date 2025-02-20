import { PropsWithChildren } from "react";
import { AuthProvider, hasAuthParams } from "react-oidc-context";
import { oidcConfig } from "../config/auth";

export const KeycloakAuthProvider = ({ children }: PropsWithChildren) => {
  if (hasAuthParams()) {
    return <AuthProvider {...oidcConfig}>{children}</AuthProvider>;
  }

  return <AuthProvider {...oidcConfig}>{children}</AuthProvider>;
};
