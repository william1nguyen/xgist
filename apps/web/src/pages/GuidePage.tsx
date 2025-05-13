import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getGuides } from "../components/guide/guideConfig";
import { Layout } from "../components/layout/Layout";
import { GuideHeader } from "../components/guide/GuideHeader";
import { GuideSidebar } from "../components/guide/GuideSidebar";
import { GuideContent } from "../components/guide/GuideContent";
import { GuideFAQ } from "../components/guide/GuideFAQ";
import { GuideCTA } from "../components/guide/GuideCTA";

export const GuidePage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(["guide", "common"]);
  const [activeGuide, setActiveGuide] = useState<number>(1);

  const guides = getGuides(t);

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleTrySummarize = () => {
    navigate("/summarize");
  };

  const handleNavigate = (destination: string) => {
    navigate(destination);
  };

  const handleNextGuide = () => {
    setActiveGuide(activeGuide < 4 ? activeGuide + 1 : 1);
  };

  const handleGuideSelect = (id: number) => {
    setActiveGuide(id);
  };

  return (
    <Layout activeItem="guide" title={t("pageTitle")}>
      <div className="max-w-7xl mx-auto px-4">
        <GuideHeader onGoBack={handleGoBack} onTryNow={handleTrySummarize} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <GuideSidebar
            guides={guides}
            activeGuide={activeGuide}
            onGuideSelect={handleGuideSelect}
          />

          <div className="md:col-span-2">
            {guides.map((guide) => (
              <GuideContent
                key={guide.id}
                guide={guide}
                isActive={guide.id === activeGuide}
                onNavigate={handleNavigate}
                onNextGuide={handleNextGuide}
              />
            ))}

            <GuideFAQ />
          </div>
        </div>

        <GuideCTA onTrySummarize={handleTrySummarize} />
      </div>
    </Layout>
  );
};
