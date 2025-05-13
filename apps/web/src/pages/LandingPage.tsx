import { useTranslation } from "react-i18next";
import { Header } from "../components/landing-page/Header";
import { HeroSection } from "../components/landing-page/HeroSection";
import { FeaturesSection } from "../components/landing-page/FeaturesSection";
import { HowItWorksSection } from "../components/landing-page/HowItWorksSection";
import { NavItem } from "../types/landingPage";
import { CTASection } from "../components/landing-page/CTASection";
import { PricingSection } from "../components/landing-page/PricingSection";
import { FAQSection } from "../components/landing-page/FAQSection";
import { Footer } from "../components/landing-page/Footer";

export const LandingPage: React.FC = () => {
  const { t } = useTranslation(["landing"]);

  const navItems: NavItem[] = [
    { href: "#features", label: t("landing:navigation.features") },
    { href: "#how-it-works", label: t("landing:navigation.how_it_works") },
    { href: "#pricing", label: t("landing:navigation.pricing") },
    { href: "#faq", label: t("landing:navigation.faq") },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-black text-white font-sans">
      <Header navItems={navItems} />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <CTASection />
      <PricingSection />
      <FAQSection />
      <CTASection variant="secondary" />
      <Footer />
    </div>
  );
};
