import { PlayCircle, Upload, Key, Share2 } from "lucide-react";
import { Guide } from "../../types/guide";

export const getGuides = (t: any): Guide[] => [
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
