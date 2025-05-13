import { FastForward, Brain, BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FeatureCard } from "../../types/landingPage";

export const FeaturesSection: React.FC = () => {
  const { t } = useTranslation(["landing"]);

  const features: FeatureCard[] = [
    {
      icon: FastForward,
      title: t("landing:features.card1.title"),
      description: t("landing:features.card1.description"),
    },
    {
      icon: Brain,
      title: t("landing:features.card2.title"),
      description: t("landing:features.card2.description"),
    },
    {
      icon: BookOpen,
      title: t("landing:features.card3.title"),
      description: t("landing:features.card3.description"),
    },
  ];

  return (
    <section id="features" className="py-16 px-6 bg-slate-900">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t("landing:features.title")}
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            {t("landing:features.subtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div key={index} className="bg-slate-800 rounded-xl p-6">
                <div className="bg-indigo-600 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                  <Icon size={24} />
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-300">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
