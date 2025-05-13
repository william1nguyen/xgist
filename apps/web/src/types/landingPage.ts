export interface NavItem {
  href: string;
  label: string;
}

export interface FeatureCard {
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  description: string;
}

export interface PricingTier {
  title: string;
  price: string;
  period?: string;
  features: string[];
  popular?: boolean;
  buttonText: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface HowItWorksStep {
  number: number;
  title: string;
  description: string;
}

export interface LanguageOption {
  code: string;
  label: string;
}
