import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { HowItWorksStep } from "../../types/landingPage";

export const HowItWorksSection: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(["landing"]);

  const steps: HowItWorksStep[] = [
    {
      number: 1,
      title: t("landing:how_it_works.step1.title"),
      description: t("landing:how_it_works.step1.description"),
    },
    {
      number: 2,
      title: t("landing:how_it_works.step2.title"),
      description: t("landing:how_it_works.step2.description"),
    },
    {
      number: 3,
      title: t("landing:how_it_works.step3.title"),
      description: t("landing:how_it_works.step3.description"),
    },
  ];

  return (
    <section id="how-it-works" className="py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t("landing:how_it_works.title")}
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            {t("landing:how_it_works.subtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div key={step.number} className="relative">
              <div className="absolute left-0 top-0 -mt-2 -ml-2 bg-indigo-600 w-8 h-8 rounded-full flex items-center justify-center font-bold">
                {step.number}
              </div>
              <div className="bg-slate-800 rounded-xl p-6 pl-8">
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-gray-300">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <button
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 transition-colors rounded-full font-bold inline-flex items-center"
            onClick={() => navigate("/summarize")}
          >
            {t("landing:buttons.get_started")}{" "}
            <ChevronRight size={20} className="ml-2" />
          </button>
        </div>
      </div>
    </section>
  );
};
