import { CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PricingTier } from "../../types/landingPage";

export const PricingSection: React.FC = () => {
  const { t } = useTranslation(["landing"]);

  const pricingTiers: PricingTier[] = [
    {
      title: t("landing:pricing.personal.title"),
      price: t("landing:pricing.personal.price"),
      period: t("landing:pricing.per_month"),
      features: [
        t("landing:pricing.personal.feature1"),
        t("landing:pricing.personal.feature2"),
        t("landing:pricing.personal.feature3"),
        t("landing:pricing.personal.feature4"),
      ],
      buttonText: t("landing:buttons.pre_register"),
    },
    {
      title: t("landing:pricing.professional.title"),
      price: t("landing:pricing.professional.price"),
      period: t("landing:pricing.per_month"),
      features: [
        t("landing:pricing.professional.feature1"),
        t("landing:pricing.professional.feature2"),
        t("landing:pricing.professional.feature3"),
        t("landing:pricing.professional.feature4"),
        t("landing:pricing.professional.feature5"),
      ],
      popular: true,
      buttonText: t("landing:buttons.pre_register"),
    },
    {
      title: t("landing:pricing.business.title"),
      price: t("landing:pricing.business.price"),
      period: t("landing:pricing.custom_solutions"),
      features: [
        t("landing:pricing.business.feature1"),
        t("landing:pricing.business.feature2"),
        t("landing:pricing.business.feature3"),
        t("landing:pricing.business.feature4"),
        t("landing:pricing.business.feature5"),
      ],
      buttonText: t("landing:buttons.contact_us"),
    },
  ];

  return (
    <section id="pricing" className="py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t("landing:pricing.title")}
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            {t("landing:pricing.subtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {pricingTiers.map((tier, index) => (
            <div
              key={index}
              className={`bg-slate-800 rounded-xl p-6 border ${
                tier.popular
                  ? "border-2 border-indigo-500 relative transform md:scale-105 z-10 shadow-xl"
                  : "border-transparent hover:border-indigo-500"
              } transition-colors`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-indigo-600 text-sm font-bold px-4 py-1 rounded-full">
                  {t("landing:pricing.most_popular")}
                </div>
              )}
              <div className="text-xl font-bold mb-2">{tier.title}</div>
              <div className="text-4xl font-bold mb-1">{tier.price}</div>
              <div className="text-gray-400 mb-6">{tier.period}</div>

              <ul className="space-y-3 mb-8">
                {tier.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start">
                    <CheckCircle
                      size={20}
                      className="text-indigo-400 mr-2 mt-1 flex-shrink-0"
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors font-medium">
                {tier.buttonText}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
