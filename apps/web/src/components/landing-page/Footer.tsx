import { FastForward } from "lucide-react";
import { useTranslation } from "react-i18next";

export const Footer: React.FC = () => {
  const { t } = useTranslation(["landing"]);

  const footerLinks = [
    { href: "#", label: t("landing:footer.terms") },
    { href: "#", label: t("landing:footer.privacy") },
    { href: "#", label: t("landing:footer.help") },
    { href: "#", label: t("landing:footer.contact") },
  ];

  return (
    <footer className="bg-slate-900 py-8 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <FastForward className="text-indigo-500" size={20} />
            <span className="text-lg font-bold">MediaSum.AI</span>
          </div>

          <div className="flex flex-wrap justify-center gap-4 md:gap-6">
            {footerLinks.map((link, index) => (
              <a
                key={index}
                href={link.href}
                className="hover:text-indigo-400 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        <div className="text-center text-gray-400 text-sm">
          &copy; {new Date().getFullYear()} MediaSum.AI.{" "}
          {t("landing:footer.copyright")}
        </div>
      </div>
    </footer>
  );
};
