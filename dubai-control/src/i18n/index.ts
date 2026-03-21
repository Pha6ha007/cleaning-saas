// dubai-control/src/i18n/index.ts
// i18n configuration — react-i18next with language detection
//
// Currently only English locale is loaded.
// To add Arabic: create ar.json, import below, add to resources.
// RTL layout support will need a separate implementation.

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";

const resources = {
  en: { translation: en },
  // ar: { translation: ar },  // ← uncomment when Arabic locale is ready
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    defaultNS: "translation",

    interpolation: {
      escapeValue: false, // React already escapes
    },

    detection: {
      // Order of language detection
      order: ["localStorage", "navigator"],
      // Cache language selection
      caches: ["localStorage"],
      lookupLocalStorage: "proof_language",
    },

    // Don't load missing keys from backend
    saveMissing: false,

    // Development: warn about missing keys
    ...(import.meta.env.DEV && {
      missingKeyHandler: (_lngs: string[], _ns: string, key: string) => {
        console.warn(`[i18n] Missing key: "${key}"`);
      },
    }),
  });

export default i18n;
