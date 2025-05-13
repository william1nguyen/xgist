import { useState } from "react";
import { FastForward, Globe, ChevronDown, Menu, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LanguageOption, NavItem } from "../../types/landingPage";

interface HeaderProps {
  navItems: NavItem[];
}

export const Header: React.FC<HeaderProps> = ({ navItems }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(["common", "landing"]);

  const languages: LanguageOption[] = [
    { code: "en", label: "English" },
    { code: "vi", label: "Tiếng Việt" },
  ];

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setLanguageMenuOpen(false);
  };

  const currentLangCode = i18n.language.startsWith("vi") ? "vi" : "en";

  const LanguageSelector = () => (
    <div className="relative">
      <button
        className="flex items-center text-white hover:text-indigo-400 transition-colors"
        onClick={() => setLanguageMenuOpen(!languageMenuOpen)}
      >
        <Globe size={18} className="mr-1" />
        <span className="hidden md:inline">
          {currentLangCode.toUpperCase()}
        </span>
        <ChevronDown size={14} className="ml-1 hidden md:inline" />
      </button>

      {languageMenuOpen && (
        <div className="absolute right-0 mt-2 w-40 bg-slate-800 rounded-md shadow-lg z-50 py-1">
          {languages.map((lang) => (
            <button
              key={lang.code}
              className={`block px-4 py-2 text-sm w-full text-left hover:bg-slate-700 transition-colors ${
                currentLangCode === lang.code ? "text-indigo-400" : "text-white"
              }`}
              onClick={() => changeLanguage(lang.code)}
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <header className="py-4 px-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <FastForward className="text-indigo-500" size={24} />
          <span className="text-xl font-bold">MediaSum.AI</span>
        </div>

        <nav className="hidden md:flex items-center space-x-8">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="hover:text-indigo-400 transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center space-x-4">
          <LanguageSelector />
          <button
            className="px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 transition-colors"
            onClick={() => navigate("/explore")}
          >
            {t("landing:buttons.free_trial")}
          </button>
        </div>

        <div className="md:hidden flex items-center space-x-4">
          <LanguageSelector />
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
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="hover:text-indigo-400 transition-colors"
              >
                {item.label}
              </a>
            ))}
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
    </>
  );
};
