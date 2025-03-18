import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FastForward,
  ChevronLeft,
  PlayCircle,
  FileText,
  Key,
  Upload,
  Clock,
  CheckCircle2,
  ChevronRight,
  Share2,
} from "lucide-react";
import { Layout } from "../components/layout/Layout";
import { Button } from "../components/ui/Button";
import { useTranslation } from "react-i18next";

export const GuidePage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(["guide", "common"]);
  const [activeGuide, setActiveGuide] = useState<number>(1);

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleTrySummarize = () => {
    navigate("/summarize");
  };

  const guides = [
    {
      id: 1,
      title: t("guide1.title"),
      icon: <PlayCircle size={40} className="text-indigo-600" />,
      description: t("guide1.description"),
      steps: [
        t("guide1.step1"),
        t("guide1.step2"),
        t("guide1.step3"),
        t("guide1.step4"),
        t("guide1.step5"),
      ],
    },
    {
      id: 2,
      title: t("guide2.title"),
      icon: <Upload size={40} className="text-indigo-600" />,
      description: t("guide2.description"),
      steps: [
        t("guide2.step1"),
        t("guide2.step2"),
        t("guide2.step3"),
        t("guide2.step4"),
        t("guide2.step5"),
      ],
    },
    {
      id: 3,
      title: t("guide3.title"),
      icon: <Key size={40} className="text-indigo-600" />,
      description: t("guide3.description"),
      steps: [
        t("guide3.step1"),
        t("guide3.step2"),
        t("guide3.step3"),
        t("guide3.step4"),
        t("guide3.step5"),
      ],
    },
    {
      id: 4,
      title: t("guide4.title"),
      icon: <Share2 size={40} className="text-indigo-600" />,
      description: t("guide4.description"),
      steps: [
        t("guide4.step1"),
        t("guide4.step2"),
        t("guide4.step3"),
        t("guide4.step4"),
        t("guide4.step5"),
      ],
    },
  ];

  const GuideNavButton = ({ guide }: { guide: (typeof guides)[0] }) => (
    <button
      className={`flex items-center p-4 rounded-lg transition-all ${
        activeGuide === guide.id
          ? "bg-indigo-50 border-l-4 border-indigo-600"
          : "hover:bg-gray-50 border-l-4 border-transparent"
      }`}
      onClick={() => setActiveGuide(guide.id)}
    >
      <div className="mr-4">{guide.icon}</div>
      <div className="text-left">
        <h3
          className={`font-medium ${activeGuide === guide.id ? "text-indigo-700" : "text-gray-800"}`}
        >
          {guide.title}
        </h3>
        <p className="text-sm text-gray-600">{guide.description}</p>
      </div>
      <ChevronRight
        size={20}
        className={`ml-auto ${activeGuide === guide.id ? "text-indigo-600" : "text-gray-500"}`}
      />
    </button>
  );

  return (
    <Layout activeItem="guide" title={t("pageTitle")}>
      <div className="max-w-7xl mx-auto px-4">
        <button
          className="flex items-center text-indigo-600 hover:text-indigo-800 mb-4 font-medium"
          onClick={handleGoBack}
        >
          <ChevronLeft size={18} />
          <span className="ml-1">{t("goBack")}</span>
        </button>

        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-lg p-8 mb-8">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold mb-4">{t("header.title")}</h1>
            <p className="text-lg mb-6 text-white">{t("header.description")}</p>
            <div className="flex gap-4">
              <Button
                variant="primary"
                leftIcon={<FastForward size={18} />}
                className="text-indigo-700 hover:bg-gray-50 font-medium"
                onClick={handleTrySummarize}
              >
                {t("header.tryNow")}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1 space-y-4">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">
              {t("selectGuide")}
            </h2>

            {guides.map((guide) => (
              <GuideNavButton key={guide.id} guide={guide} />
            ))}

            <div className="bg-indigo-50 p-4 rounded-lg mt-6">
              <h3 className="font-medium flex items-center text-indigo-700">
                <Clock size={18} className="mr-2" />
                {t("timeSaver.title")}
              </h3>
              <p className="text-sm text-gray-700 mt-2">
                {t("timeSaver.description")}
              </p>
            </div>
          </div>

          <div className="md:col-span-2">
            {guides.map(
              (guide) =>
                guide.id === activeGuide && (
                  <div
                    key={guide.id}
                    className="border border-gray-200 rounded-lg p-6 shadow-sm"
                  >
                    <div className="flex items-center mb-6">
                      {guide.icon}
                      <h2 className="text-2xl font-bold ml-4 text-gray-900">
                        {guide.title}
                      </h2>
                    </div>

                    <p className="text-gray-700 mb-6">{guide.description}</p>

                    <div className="space-y-4 mb-8">
                      {guide.steps.map((step, index) => (
                        <div key={index} className="flex items-start">
                          <div className="bg-indigo-100 text-indigo-800 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-1 font-medium">
                            {index + 1}
                          </div>
                          <p className="ml-3 text-gray-800">{step}</p>
                        </div>
                      ))}
                    </div>

                    <div className="bg-indigo-50 p-4 rounded-lg">
                      <h3 className="font-medium flex items-center text-indigo-700 mb-2">
                        <CheckCircle2 size={18} className="mr-2" />
                        {t("tips.title")}
                      </h3>
                      <p className="text-sm text-gray-700">
                        {t(`tips.guide${guide.id}`)}
                      </p>
                    </div>

                    <div className="mt-8 flex flex-wrap gap-3">
                      {guide.id === 1 && (
                        <Button
                          variant="primary"
                          leftIcon={<PlayCircle size={16} />}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                          onClick={() => navigate("/summarize?source=youtube")}
                        >
                          {t("buttons.summarizeYoutube")}
                        </Button>
                      )}
                      {guide.id === 2 && (
                        <Button
                          variant="primary"
                          leftIcon={<Upload size={16} />}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                          onClick={() => navigate("/summarize?source=upload")}
                        >
                          {t("buttons.uploadVideo")}
                        </Button>
                      )}
                      {guide.id === 3 && (
                        <Button
                          variant="primary"
                          leftIcon={<Key size={16} />}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                          onClick={() => navigate("/summarize?advanced=true")}
                        >
                          {t("buttons.exploreAdvanced")}
                        </Button>
                      )}
                      {guide.id === 4 && (
                        <Button
                          variant="primary"
                          leftIcon={<FileText size={16} />}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                          onClick={() => navigate("/library")}
                        >
                          {t("buttons.goToLibrary")}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        leftIcon={
                          guide.id < 4 ? (
                            <ChevronRight size={16} />
                          ) : (
                            <FastForward size={16} />
                          )
                        }
                        className="border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-medium"
                        onClick={() =>
                          setActiveGuide(guide.id < 4 ? guide.id + 1 : 1)
                        }
                      >
                        {guide.id < 4
                          ? t("buttons.nextGuide")
                          : t("buttons.startOver")}
                      </Button>
                    </div>
                  </div>
                )
            )}

            <div className="mt-8 bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold mb-3 text-gray-900">
                {t("faq.title")}
              </h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">
                    {t("faq.q1.question")}
                  </h4>
                  <p className="text-sm text-gray-700 mt-1">
                    {t("faq.q1.answer")}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">
                    {t("faq.q2.question")}
                  </h4>
                  <p className="text-sm text-gray-700 mt-1">
                    {t("faq.q2.answer")}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">
                    {t("faq.q3.question")}
                  </h4>
                  <p className="text-sm text-gray-700 mt-1">
                    {t("faq.q3.answer")}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">
                    {t("faq.q4.question")}
                  </h4>
                  <p className="text-sm text-gray-700 mt-1">
                    {t("faq.q4.answer")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-indigo-600 text-white py-8 px-6 rounded-lg mt-12 mb-6">
          <div className="max-w-4xl mx-auto">
            <div className="md:flex items-center justify-between">
              <div className="mb-6 md:mb-0">
                <h3 className="text-xl font-bold mb-2">{t("cta.title")}</h3>
                <p className="text-white">{t("cta.description")}</p>
              </div>
              <Button
                variant="outline"
                className="bg-white text-indigo-700 hover:bg-gray-50 border-white font-medium"
                leftIcon={<FastForward size={18} />}
                onClick={handleTrySummarize}
              >
                {t("cta.button")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
