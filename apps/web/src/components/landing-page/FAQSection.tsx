import { useTranslation } from "react-i18next";
import { FAQItem } from "../../types/landingPage";

export const FAQSection: React.FC = () => {
  const { t } = useTranslation(["landing"]);

  const faqItems: FAQItem[] = [
    {
      question: t("landing:faq.q1"),
      answer: t("landing:faq.a1"),
    },
    {
      question: t("landing:faq.q2"),
      answer: t("landing:faq.a2"),
    },
    {
      question: t("landing:faq.q3"),
      answer: t("landing:faq.a3"),
    },
    {
      question: t("landing:faq.q4"),
      answer: t("landing:faq.a4"),
    },
  ];

  return (
    <section id="faq" className="py-16 px-6 bg-slate-900">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold mb-12 text-center">
          {t("landing:faq.title")}
        </h2>

        <div className="space-y-6">
          {faqItems.map((item, index) => (
            <div key={index} className="bg-slate-800 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-3">{item.question}</h3>
              <p className="text-gray-300">{item.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
