import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/locales/en.json";
import it from "@/locales/it.json";
import fr from "@/locales/fr.json";
import de from "@/locales/de.json";
import es from "@/locales/es.json";
import pt from "@/locales/pt.json";

export const UI_LANG_KEY = "echoes_ui_language";

export const SUPPORTED_UI_LANGS = ["it", "en", "fr", "de", "es", "pt"] as const;
export type SupportedUiLang = (typeof SUPPORTED_UI_LANGS)[number];

export function isSupported(lang: string): lang is SupportedUiLang {
  return (SUPPORTED_UI_LANGS as readonly string[]).includes(lang);
}

function primaryLanguage(lang: string): string {
  return lang.split("-")[0]?.toLowerCase() ?? "";
}

function browserLanguages(): string[] {
  if (typeof navigator === "undefined") return ["en"];
  const langs = Array.isArray(navigator.languages) && navigator.languages.length > 0 ? navigator.languages : [navigator.language];
  return langs.filter(Boolean);
}

export function resolveUiLanguage(stored: string | null, navigatorLangs?: string | readonly string[]): SupportedUiLang {
  if (stored && isSupported(stored)) return stored;
  const preferred = typeof navigatorLangs === "string" ? [navigatorLangs] : navigatorLangs ?? browserLanguages();
  for (const lang of preferred) {
    const nav = primaryLanguage(lang);
    if (isSupported(nav)) return nav;
  }
  return "en";
}

export function readStoredUiLanguage(): SupportedUiLang {
  try {
    return resolveUiLanguage(localStorage.getItem(UI_LANG_KEY));
  } catch {
    return "en";
  }
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    it: { translation: it },
    fr: { translation: fr },
    de: { translation: de },
    es: { translation: es },
    pt: { translation: pt },
  },
  lng: readStoredUiLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
