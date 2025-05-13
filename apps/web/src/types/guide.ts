export interface GuideStep {
  step: string;
}

export interface Guide {
  id: number;
  title: string;
  icon: React.ReactElement;
  description: string;
  steps: string[];
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface GuideNavButtonProps {
  guide: Guide;
  isActive: boolean;
  onClick: () => void;
}

export interface GuideContentProps {
  guide: Guide;
  isActive: boolean;
  onNavigate: (destination: string) => void;
  onNextGuide: () => void;
}

export interface GuideHeaderProps {
  onGoBack: () => void;
  onTryNow: () => void;
}

export interface GuideCTAProps {
  onTrySummarize: () => void;
}
