import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface CTASectionProps {
  variant?: "primary" | "secondary";
}

export const CTASection: React.FC<CTASectionProps> = ({
  variant = "primary",
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation(["landing"]);

  if (variant === "secondary") {
    return (
      <section className="bg-gradient-to-r from-indigo-900 to-violet-900 py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            {t("landing:final_cta.title")}
          </h2>
          <p className="text-xl mb-8">{t("landing:final_cta.description")}</p>
          <button
            className="bg-white text-indigo-800 hover:bg-gray-100 transition-colors px-8 py-3 rounded-full font-bold"
            onClick={() => navigate("/summarize")}
          >
            {t("landing:buttons.signup_free_trial")}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 px-6 bg-gradient-to-r from-indigo-900 to-violet-900">
      <div className="max-w-4xl mx-auto text-center">
        <div className="bg-indigo-500 bg-opacity-20 p-8 rounded-2xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            {t("landing:cta.title")}
          </h2>
          <p className="text-xl mb-8">{t("landing:cta.description")}</p>
          <button
            className="px-8 py-3 bg-white text-indigo-800 hover:bg-gray-100 transition-colors rounded-full font-bold"
            onClick={() => navigate("/explore")}
          >
            {t("landing:buttons.free_trial")}
          </button>
        </div>
      </div>
    </section>
  );
};
