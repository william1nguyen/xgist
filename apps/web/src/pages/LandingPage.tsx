import { useState } from "react";
import {
  BookOpen,
  CheckCircle,
  FastForward,
  Brain,
  Zap,
  ChevronRight,
  Play,
  Menu,
  X,
  Globe,
  ChevronDown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const LandingPage = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(["common", "landing"]);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setLanguageMenuOpen(false);
  };

  const currentLangCode = i18n.language.startsWith("vi") ? "vi" : "en";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-black text-white font-sans">
      <header className="py-4 px-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <FastForward className="text-indigo-500" size={24} />
          <span className="text-xl font-bold">VideoSum.AI</span>
        </div>

        <nav className="hidden md:flex items-center space-x-8">
          <a
            href="#features"
            className="hover:text-indigo-400 transition-colors"
          >
            {t("landing:navigation.features")}
          </a>
          <a
            href="#how-it-works"
            className="hover:text-indigo-400 transition-colors"
          >
            {t("landing:navigation.how_it_works")}
          </a>
          <a
            href="#pricing"
            className="hover:text-indigo-400 transition-colors"
          >
            {t("landing:navigation.pricing")}
          </a>
          <a href="#faq" className="hover:text-indigo-400 transition-colors">
            {t("landing:navigation.faq")}
          </a>
        </nav>

        <div className="hidden md:flex items-center space-x-4">
          <div className="relative">
            <button
              className="flex items-center text-white hover:text-indigo-400 transition-colors"
              onClick={() => setLanguageMenuOpen(!languageMenuOpen)}
            >
              <Globe size={18} className="mr-1" />
              <span>{currentLangCode.toUpperCase()}</span>
              <ChevronDown size={14} className="ml-1" />
            </button>

            {languageMenuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-slate-800 rounded-md shadow-lg z-50 py-1">
                <button
                  className={`block px-4 py-2 text-sm w-full text-left hover:bg-slate-700 transition-colors ${currentLangCode === "en" ? "text-indigo-400" : "text-white"}`}
                  onClick={() => changeLanguage("en")}
                >
                  English
                </button>
                <button
                  className={`block px-4 py-2 text-sm w-full text-left hover:bg-slate-700 transition-colors ${currentLangCode === "vi" ? "text-indigo-400" : "text-white"}`}
                  onClick={() => changeLanguage("vi")}
                >
                  Tiếng Việt
                </button>
              </div>
            )}
          </div>

          <button
            className="px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 transition-colors"
            onClick={() => navigate("/explore")}
          >
            {t("landing:buttons.free_trial")}
          </button>
        </div>

        <div className="md:hidden flex items-center space-x-4">
          <div className="relative">
            <button
              className="flex items-center text-white hover:text-indigo-400 transition-colors"
              onClick={() => setLanguageMenuOpen(!languageMenuOpen)}
            >
              <Globe size={18} />
            </button>

            {languageMenuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-slate-800 rounded-md shadow-lg z-50 py-1">
                <button
                  className={`block px-4 py-2 text-sm w-full text-left hover:bg-slate-700 transition-colors ${currentLangCode === "en" ? "text-indigo-400" : "text-white"}`}
                  onClick={() => changeLanguage("en")}
                >
                  English
                </button>
                <button
                  className={`block px-4 py-2 text-sm w-full text-left hover:bg-slate-700 transition-colors ${currentLangCode === "vi" ? "text-indigo-400" : "text-white"}`}
                  onClick={() => changeLanguage("vi")}
                >
                  Tiếng Việt
                </button>
              </div>
            )}
          </div>

          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-800 p-4">
          <nav className="flex flex-col space-y-4">
            <a
              href="#features"
              className="hover:text-indigo-400 transition-colors"
            >
              {t("landing:navigation.features")}
            </a>
            <a
              href="#how-it-works"
              className="hover:text-indigo-400 transition-colors"
            >
              {t("landing:navigation.how_it_works")}
            </a>
            <a
              href="#pricing"
              className="hover:text-indigo-400 transition-colors"
            >
              {t("landing:navigation.pricing")}
            </a>
            <a href="#faq" className="hover:text-indigo-400 transition-colors">
              {t("landing:navigation.faq")}
            </a>
            <div className="flex flex-col space-y-2 pt-4 border-t border-gray-700">
              <button className="px-4 py-2 rounded-full bg-transparent border border-gray-500 hover:border-white transition-colors">
                {t("landing:buttons.login")}
              </button>
              <button
                className="px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 transition-colors"
                onClick={() => navigate("/explore")}
              >
                {t("landing:buttons.free_trial")}
              </button>
            </div>
          </nav>
        </div>
      )}

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
            <div className="bg-slate-800 rounded-xl p-6">
              <div className="bg-indigo-600 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <FastForward size={24} />
              </div>
              <h3 className="text-xl font-bold mb-2">
                {t("landing:features.card1.title")}
              </h3>
              <p className="text-gray-300">
                {t("landing:features.card1.description")}
              </p>
            </div>

            <div className="bg-slate-800 rounded-xl p-6">
              <div className="bg-indigo-600 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <Brain size={24} />
              </div>
              <h3 className="text-xl font-bold mb-2">
                {t("landing:features.card2.title")}
              </h3>
              <p className="text-gray-300">
                {t("landing:features.card2.description")}
              </p>
            </div>

            <div className="bg-slate-800 rounded-xl p-6">
              <div className="bg-indigo-600 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <BookOpen size={24} />
              </div>
              <h3 className="text-xl font-bold mb-2">
                {t("landing:features.card3.title")}
              </h3>
              <p className="text-gray-300">
                {t("landing:features.card3.description")}
              </p>
            </div>
          </div>
        </div>
      </section>

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
            <div className="relative">
              <div className="absolute left-0 top-0 -mt-2 -ml-2 bg-indigo-600 w-8 h-8 rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div className="bg-slate-800 rounded-xl p-6 pl-8">
                <h3 className="text-xl font-bold mb-3">
                  {t("landing:how_it_works.step1.title")}
                </h3>
                <p className="text-gray-300">
                  {t("landing:how_it_works.step1.description")}
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute left-0 top-0 -mt-2 -ml-2 bg-indigo-600 w-8 h-8 rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div className="bg-slate-800 rounded-xl p-6 pl-8">
                <h3 className="text-xl font-bold mb-3">
                  {t("landing:how_it_works.step2.title")}
                </h3>
                <p className="text-gray-300">
                  {t("landing:how_it_works.step2.description")}
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute left-0 top-0 -mt-2 -ml-2 bg-indigo-600 w-8 h-8 rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div className="bg-slate-800 rounded-xl p-6 pl-8">
                <h3 className="text-xl font-bold mb-3">
                  {t("landing:how_it_works.step3.title")}
                </h3>
                <p className="text-gray-300">
                  {t("landing:how_it_works.step3.description")}
                </p>
              </div>
            </div>
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
            <div className="bg-slate-800 rounded-xl p-6 border border-transparent hover:border-indigo-500 transition-colors">
              <div className="text-xl font-bold mb-2">
                {t("landing:pricing.personal.title")}
              </div>
              <div className="text-4xl font-bold mb-1">
                {t("landing:pricing.personal.price")}
              </div>
              <div className="text-gray-400 mb-6">
                {t("landing:pricing.per_month")}
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <CheckCircle
                    size={20}
                    className="text-indigo-400 mr-2 mt-1 flex-shrink-0"
                  />
                  <span>{t("landing:pricing.personal.feature1")}</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle
                    size={20}
                    className="text-indigo-400 mr-2 mt-1 flex-shrink-0"
                  />
                  <span>{t("landing:pricing.personal.feature2")}</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle
                    size={20}
                    className="text-indigo-400 mr-2 mt-1 flex-shrink-0"
                  />
                  <span>{t("landing:pricing.personal.feature3")}</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle
                    size={20}
                    className="text-indigo-400 mr-2 mt-1 flex-shrink-0"
                  />
                  <span>{t("landing:pricing.personal.feature4")}</span>
                </li>
              </ul>

              <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors font-medium">
                {t("landing:buttons.pre_register")}
              </button>
            </div>

            <div className="bg-slate-800 rounded-xl p-6 border-2 border-indigo-500 relative transform md:scale-105 z-10 shadow-xl">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-indigo-600 text-sm font-bold px-4 py-1 rounded-full">
                {t("landing:pricing.most_popular")}
              </div>
              <div className="text-xl font-bold mb-2">
                {t("landing:pricing.professional.title")}
              </div>
              <div className="text-4xl font-bold mb-1">
                {t("landing:pricing.professional.price")}
              </div>
              <div className="text-gray-400 mb-6">
                {t("landing:pricing.per_month")}
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <CheckCircle
                    size={20}
                    className="text-indigo-400 mr-2 mt-1 flex-shrink-0"
                  />
                  <span>{t("landing:pricing.professional.feature1")}</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle
                    size={20}
                    className="text-indigo-400 mr-2 mt-1 flex-shrink-0"
                  />
                  <span>{t("landing:pricing.professional.feature2")}</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle
                    size={20}
                    className="text-indigo-400 mr-2 mt-1 flex-shrink-0"
                  />
                  <span>{t("landing:pricing.professional.feature3")}</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle
                    size={20}
                    className="text-indigo-400 mr-2 mt-1 flex-shrink-0"
                  />
                  <span>{t("landing:pricing.professional.feature4")}</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle
                    size={20}
                    className="text-indigo-400 mr-2 mt-1 flex-shrink-0"
                  />
                  <span>{t("landing:pricing.professional.feature5")}</span>
                </li>
              </ul>

              <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors font-medium">
                {t("landing:buttons.pre_register")}
              </button>
            </div>

            <div className="bg-slate-800 rounded-xl p-6 border border-transparent hover:border-indigo-500 transition-colors">
              <div className="text-xl font-bold mb-2">
                {t("landing:pricing.business.title")}
              </div>
              <div className="text-4xl font-bold mb-1">
                {t("landing:pricing.business.price")}
              </div>
              <div className="text-gray-400 mb-6">
                {t("landing:pricing.custom_solutions")}
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <CheckCircle
                    size={20}
                    className="text-indigo-400 mr-2 mt-1 flex-shrink-0"
                  />
                  <span>{t("landing:pricing.business.feature1")}</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle
                    size={20}
                    className="text-indigo-400 mr-2 mt-1 flex-shrink-0"
                  />
                  <span>{t("landing:pricing.business.feature2")}</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle
                    size={20}
                    className="text-indigo-400 mr-2 mt-1 flex-shrink-0"
                  />
                  <span>{t("landing:pricing.business.feature3")}</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle
                    size={20}
                    className="text-indigo-400 mr-2 mt-1 flex-shrink-0"
                  />
                  <span>{t("landing:pricing.business.feature4")}</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle
                    size={20}
                    className="text-indigo-400 mr-2 mt-1 flex-shrink-0"
                  />
                  <span>{t("landing:pricing.business.feature5")}</span>
                </li>
              </ul>

              <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors font-medium">
                {t("landing:buttons.contact_us")}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="py-16 px-6 bg-slate-900">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">
            {t("landing:faq.title")}
          </h2>

          <div className="space-y-6">
            <div className="bg-slate-800 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-3">{t("landing:faq.q1")}</h3>
              <p className="text-gray-300">{t("landing:faq.a1")}</p>
            </div>

            <div className="bg-slate-800 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-3">{t("landing:faq.q2")}</h3>
              <p className="text-gray-300">{t("landing:faq.a2")}</p>
            </div>

            <div className="bg-slate-800 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-3">{t("landing:faq.q3")}</h3>
              <p className="text-gray-300">{t("landing:faq.a3")}</p>
            </div>

            <div className="bg-slate-800 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-3">{t("landing:faq.q4")}</h3>
              <p className="text-gray-300">{t("landing:faq.a4")}</p>
            </div>
          </div>
        </div>
      </section>

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

      <footer className="bg-slate-900 py-8 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <FastForward className="text-indigo-500" size={20} />
              <span className="text-lg font-bold">VideoSum.AI</span>
            </div>

            <div className="flex flex-wrap justify-center gap-4 md:gap-6">
              <a href="#" className="hover:text-indigo-400 transition-colors">
                {t("landing:footer.terms")}
              </a>
              <a href="#" className="hover:text-indigo-400 transition-colors">
                {t("landing:footer.privacy")}
              </a>
              <a href="#" className="hover:text-indigo-400 transition-colors">
                {t("landing:footer.help")}
              </a>
              <a href="#" className="hover:text-indigo-400 transition-colors">
                {t("landing:footer.contact")}
              </a>
            </div>
          </div>

          <div className="text-center text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} VideoSum.AI.{" "}
            {t("landing:footer.copyright")}
          </div>
        </div>
      </footer>
    </div>
  );
};
