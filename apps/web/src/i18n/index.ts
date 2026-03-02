import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import enCommon from "./locales/en/common.json";
import enExplore from "./locales/en/explore.json";
import enGuide from "./locales/en/guide.json";
import enLanding from "./locales/en/landing.json";
import enLibrary from "./locales/en/library.json";
import enSettings from "./locales/en/settings.json";
import enSidebar from "./locales/en/sidebar.json";
import enSummary from "./locales/en/summary.json";
import enTrending from "./locales/en/trending.json";
import enVideoDetail from "./locales/en/videoDetail.json";
import enVideos from "./locales/en/videos.json";
import viCommon from "./locales/vi/common.json";
import viExplore from "./locales/vi/explore.json";
import viGuide from "./locales/vi/guide.json";
import viLanding from "./locales/vi/landing.json";
import viLibrary from "./locales/vi/library.json";
import viSettings from "./locales/vi/settings.json";
import viSidebar from "./locales/vi/sidebar.json";
import viSummary from "./locales/vi/summary.json";
import viTrending from "./locales/vi/trending.json";
import viVideoDetail from "./locales/vi/videoDetail.json";
import viVideos from "./locales/vi/videos.json";

export default i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        sidebar: enSidebar,
        guide: enGuide,
        videos: enVideos,
        summary: enSummary,
        landing: enLanding,
        library: enLibrary,
        explore: enExplore,
        settings: enSettings,
        trending: enTrending,
        videoDetail: enVideoDetail,
      },
      vi: {
        common: viCommon,
        sidebar: viSidebar,
        guide: viGuide,
        videos: viVideos,
        summary: viSummary,
        landing: viLanding,
        library: viLibrary,
        explore: viExplore,
        settings: viSettings,
        trending: viTrending,
        videoDetail: viVideoDetail,
      },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "vi"],

    interpolation: {
      escapeValue: false,
    },

    ns: [
      "common",
      "sidebar",
      "guide",
      "videos",
      "summary",
      "landing",
      "library",
      "explore",
      "settings",
      "trending",
      "videoDetail",
    ],
    defaultNS: "common",

    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });
