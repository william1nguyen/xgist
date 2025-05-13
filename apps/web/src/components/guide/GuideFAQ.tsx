import React from "react";
import { useTranslation } from "react-i18next";
import { FAQItem } from "../../types/landingPage";

export const GuideFAQ: React.FC = () => {
  const { t } = useTranslation(["guide"]);

  const faqItems: FAQItem[] = [
    {
      question: t("faq.q1.question"),
      answer: t("faq.q1.answer"),
    },
    {
      question: t("faq.q2.question"),
      answer: t("faq.q2.answer"),
    },
    {
      question: t("faq.q3.question"),
      answer: t("faq.q3.answer"),
    },
    {
      question: t("faq.q4.question"),
      answer: t("faq.q4.answer"),
    },
  ];

  return (
    <div className="mt-8 bg-gray-50 p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold mb-3 text-gray-900">
        {t("faq.title")}
      </h3>
      <div className="space-y-4">
        {faqItems.map((item, index) => (
          <div key={index}>
            <h4 className="font-medium text-gray-900">{item.question}</h4>
            <p className="text-sm text-gray-700 mt-1">{item.answer}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
