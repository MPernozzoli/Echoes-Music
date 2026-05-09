import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  SUPPORTED_UI_LANGS,
  isSupported,
  type SupportedUiLang,
} from "@/i18n/config";

const DEFAULT_SITE_ORIGIN = "https://echoesmusic.it";
const SITE_ORIGIN = (import.meta.env.VITE_SITE_URL || DEFAULT_SITE_ORIGIN).replace(/\/+$/, "");
const LANDING_PATH = /^\/(?:it|en|fr|de|es|pt)?\/?$/;

const SEO_COPY: Record<SupportedUiLang, { title: string; description: string }> = {
  it: {
    title: "Echoes - Trova il brano che dice quello che intendi",
    description: "Descrivi un sentimento, un ricordo o un pensiero. Echoes lo trasforma in consigli musicali con contesto.",
  },
  en: {
    title: "Echoes - Find the song that says what you mean",
    description: "Describe a feeling, a memory, or a thought. Echoes turns it into music recommendations with context.",
  },
  fr: {
    title: "Echoes - Trouvez le morceau qui dit ce que vous voulez dire",
    description: "Décrivez un sentiment, un souvenir ou une pensée. Echoes le transforme en recommandations musicales contextualisées.",
  },
  de: {
    title: "Echoes - Finde den Song, der sagt, was du meinst",
    description: "Beschreibe ein Gefühl, eine Erinnerung oder einen Gedanken. Echoes macht daraus Musikempfehlungen mit Kontext.",
  },
  es: {
    title: "Echoes - Encuentra la canción que dice lo que quieres decir",
    description: "Describe un sentimiento, un recuerdo o un pensamiento. Echoes lo convierte en recomendaciones musicales con contexto.",
  },
  pt: {
    title: "Echoes - Encontre a música que diz o que você quer dizer",
    description: "Descreva um sentimento, uma memória ou um pensamento. Echoes transforma isso em recomendações musicais com contexto.",
  },
};

function firstPathSegment(pathname: string): string | null {
  return pathname.split("/").filter(Boolean)[0] ?? null;
}

function resolveSeoLanguage(pathname: string, i18nLanguage: string): SupportedUiLang {
  const pathLang = firstPathSegment(pathname);
  if (pathLang && isSupported(pathLang)) return pathLang;
  const activeLang = i18nLanguage.split("-")[0]?.toLowerCase() ?? "";
  return isSupported(activeLang) ? activeLang : "en";
}

function landingUrl(lang: SupportedUiLang): string {
  return `${SITE_ORIGIN}/${lang}`;
}

function upsertMeta(selector: string, attrs: Record<string, string>) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([name, value]) => el.setAttribute(name, value));
}

function upsertLink(selector: string, attrs: Record<string, string>) {
  let el = document.head.querySelector<HTMLLinkElement>(selector);
  if (!el) {
    el = document.createElement("link");
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([name, value]) => el.setAttribute(name, value));
}

export function SeoHead() {
  const { pathname } = useLocation();
  const { i18n } = useTranslation();

  useEffect(() => {
    const isLanding = LANDING_PATH.test(pathname);
    const lang = resolveSeoLanguage(pathname, i18n.language);
    const copy = SEO_COPY[lang];
    const canonical = isLanding ? landingUrl(lang) : `${SITE_ORIGIN}${pathname}`;

    document.title = copy.title;
    document.documentElement.lang = lang;

    upsertMeta("meta[name='description']", { name: "description", content: copy.description });
    upsertMeta("meta[property='og:title']", { property: "og:title", content: copy.title });
    upsertMeta("meta[property='og:description']", { property: "og:description", content: copy.description });
    upsertMeta("meta[property='og:url']", { property: "og:url", content: canonical });
    upsertMeta("meta[property='og:locale']", { property: "og:locale", content: lang });
    upsertMeta("meta[name='twitter:title']", { name: "twitter:title", content: copy.title });
    upsertMeta("meta[name='twitter:description']", { name: "twitter:description", content: copy.description });
    upsertLink("link[rel='canonical']", { rel: "canonical", href: canonical });

    document.head.querySelectorAll("link[data-echoes-hreflang]").forEach((el) => el.remove());
    if (isLanding) {
      SUPPORTED_UI_LANGS.forEach((code) => {
        const link = document.createElement("link");
        link.setAttribute("rel", "alternate");
        link.setAttribute("hreflang", code);
        link.setAttribute("href", landingUrl(code));
        link.setAttribute("data-echoes-hreflang", "1");
        document.head.appendChild(link);
      });
      const fallback = document.createElement("link");
      fallback.setAttribute("rel", "alternate");
      fallback.setAttribute("hreflang", "x-default");
      fallback.setAttribute("href", `${SITE_ORIGIN}/`);
      fallback.setAttribute("data-echoes-hreflang", "1");
      document.head.appendChild(fallback);
    }
  }, [i18n.language, pathname]);

  return null;
}
