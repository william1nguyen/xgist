import { FastForward, Zap, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const HeroSection: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(["landing"]);

  return (
    <section className="px-6 py-16 md:py-24 max-w-6xl mx-auto">
      <div className="grid md:grid-cols-2 gap-8 items-center">
        <div>
          <div className="inline-block px-3 py-1 rounded-full bg-indigo-900 text-indigo-300 text-sm font-medium mb-4">
            {t("landing:hero.tagline")}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {t("landing:hero.title")}
          </h1>
          <p className="text-gray-300 text-lg mb-8">
            {t("landing:hero.description")}
          </p>

          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <button
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 transition-colors rounded-full font-medium flex items-center justify-center"
              onClick={() => navigate("/summarize")}
            >
              <Zap className="mr-2" size={20} />
              {t("landing:buttons.summarize_now")}
            </button>
            <button className="px-6 py-3 bg-gray-800 hover:bg-gray-700 transition-colors rounded-full font-medium flex items-center justify-center">
              <Play className="mr-2" size={20} />
              {t("landing:buttons.watch_demo")}
            </button>
          </div>
        </div>

        <div className="relative">
          <div className="bg-gradient-to-tr from-violet-600 to-indigo-500 rounded-lg shadow-2xl aspect-video flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black bg-opacity-40">
              <FastForward size={48} className="mb-4" />
              <div className="font-bold text-xl mb-2">
                {t("landing:hero.demo.original")}
              </div>
              <div className="h-2 w-full bg-gray-700 rounded-full mb-4">
                <div className="h-2 bg-indigo-500 rounded-full w-3/4"></div>
              </div>
              <div className="text-4xl font-bold">→</div>
              <div className="font-bold text-xl mt-2 mb-2">
                {t("landing:hero.demo.summary")}
              </div>
              <div className="h-2 w-full bg-gray-700 rounded-full">
                <div className="h-2 bg-indigo-500 rounded-full w-1/4"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
