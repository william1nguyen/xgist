import React, { ReactNode } from "react";
import { LogIn, Lock } from "lucide-react";

import { useTranslation } from "react-i18next";
import { useKeycloakAuth } from "../hooks/useKeycloakAuth";
import { Button } from "./ui/Button";

interface AuthGateProps {
  children: ReactNode;
}

export const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const { isAuthenticated, login } = useKeycloakAuth();
  const { t } = useTranslation(["common", "videoDetail"]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="p-16 text-center bg-white rounded-lg shadow-md">
          <div className="mb-4 bg-white border border-gray-200 h-16 w-16 rounded-full flex items-center justify-center mx-auto">
            <Lock size={32} className="text-black" />
          </div>
          <h3 className="text-xl font-bold text-black mb-2">
            {t("videoDetail:auth.locked_content")}
          </h3>
          <p className="text-gray-800 mb-6 max-w-md mx-auto">
            {t("videoDetail:auth.login_message")}
          </p>
          <Button
            variant="outline"
            onClick={() => login()}
            type="button"
            className="flex items-center mx-auto border border-black text-black hover:bg-gray-100"
          >
            <LogIn size={18} className="mr-2" />
            {t("videoDetail:buttons.login_now")}
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
