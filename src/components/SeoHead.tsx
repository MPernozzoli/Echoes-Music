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

type Copy = { title: string; description: string };

const ROUTE_COPY: Record<string, Record<SupportedUiLang, Copy>> = {
  "/pricing": {
    it: { title: "Prezzi e piani - Echoes", description: "Scegli il piano Echoes giusto per te: ricerche AI illimitate, token e funzioni premium per il tuo diario musicale." },
    en: { title: "Pricing & plans - Echoes", description: "Pick the Echoes plan that fits you: unlimited AI searches, tokens, and premium features for your music journal." },
    fr: { title: "Tarifs et formules - Echoes", description: "Choisissez la formule Echoes qui vous convient : recherches IA illimitées, jetons et fonctionnalités premium." },
    de: { title: "Preise & Tarife - Echoes", description: "Wähle den passenden Echoes-Tarif: unbegrenzte KI-Suchen, Token und Premium-Funktionen für dein Musiktagebuch." },
    es: { title: "Precios y planes - Echoes", description: "Elige el plan Echoes ideal: búsquedas IA ilimitadas, tokens y funciones premium para tu diario musical." },
    pt: { title: "Preços e planos - Echoes", description: "Escolha o plano Echoes ideal: buscas com IA ilimitadas, tokens e recursos premium para o seu diário musical." },
  },
  "/pricing/plan": {
    it: { title: "Iscriviti a Echoes Premium", description: "Attiva l'abbonamento Echoes e sblocca ricerche AI illimitate, sync libreria e cronologia avanzata." },
    en: { title: "Subscribe to Echoes Premium", description: "Activate your Echoes subscription and unlock unlimited AI searches, library sync, and advanced history." },
    fr: { title: "Abonnez-vous à Echoes Premium", description: "Activez votre abonnement Echoes pour des recherches IA illimitées, la synchro de bibliothèque et un historique avancé." },
    de: { title: "Echoes Premium abonnieren", description: "Aktiviere dein Echoes-Abo für unbegrenzte KI-Suchen, Bibliothekssynchronisation und erweiterten Verlauf." },
    es: { title: "Suscríbete a Echoes Premium", description: "Activa tu suscripción Echoes y desbloquea búsquedas IA ilimitadas, sincronización y un historial avanzado." },
    pt: { title: "Assine o Echoes Premium", description: "Ative sua assinatura Echoes para buscas IA ilimitadas, sincronização de biblioteca e histórico avançado." },
  },
  "/pricing/tokens": {
    it: { title: "Acquista token - Echoes", description: "Ricarica i tuoi token Echoes per continuare a scoprire musica con l'AI." },
    en: { title: "Buy tokens - Echoes", description: "Top up your Echoes tokens to keep discovering music with AI." },
    fr: { title: "Acheter des jetons - Echoes", description: "Rechargez vos jetons Echoes pour découvrir de la musique avec l'IA." },
    de: { title: "Token kaufen - Echoes", description: "Lade deine Echoes-Token auf, um Musik mit KI zu entdecken." },
    es: { title: "Comprar tokens - Echoes", description: "Recarga tus tokens Echoes para descubrir música con IA." },
    pt: { title: "Comprar tokens - Echoes", description: "Recarregue seus tokens Echoes para descobrir música com IA." },
  },
  "/chat": {
    it: { title: "Chat musicale AI - Echoes", description: "Conversa con Echoes per esplorare sentimenti e ricevere brani che parlano davvero di te." },
    en: { title: "AI music chat - Echoes", description: "Chat with Echoes to explore feelings and get songs that truly speak to you." },
    fr: { title: "Chat musical IA - Echoes", description: "Discutez avec Echoes pour explorer vos émotions et recevoir des morceaux qui vous parlent." },
    de: { title: "KI-Musik-Chat - Echoes", description: "Chatte mit Echoes, um Gefühle zu erkunden und Songs zu finden, die dich wirklich treffen." },
    es: { title: "Chat musical IA - Echoes", description: "Habla con Echoes para explorar emociones y recibir canciones que te representen." },
    pt: { title: "Chat musical IA - Echoes", description: "Converse com Echoes para explorar emoções e receber músicas que falam por você." },
  },
  "/discover": {
    it: { title: "Scopri musica - Echoes", description: "Suggerimenti musicali AI basati su un'idea, un mood o un ricordo." },
    en: { title: "Discover music - Echoes", description: "AI music suggestions from an idea, a mood, or a memory." },
    fr: { title: "Découvrir la musique - Echoes", description: "Suggestions musicales IA à partir d'une idée, d'une humeur ou d'un souvenir." },
    de: { title: "Musik entdecken - Echoes", description: "KI-Musikvorschläge aus einer Idee, Stimmung oder Erinnerung." },
    es: { title: "Descubre música - Echoes", description: "Sugerencias musicales con IA a partir de una idea, ánimo o recuerdo." },
    pt: { title: "Descubra música - Echoes", description: "Sugestões musicais com IA a partir de uma ideia, humor ou memória." },
  },
  "/history": {
    it: { title: "Cronologia - Echoes", description: "Rivisita ricerche e sessioni d'ascolto come un diario musicale personale." },
    en: { title: "History - Echoes", description: "Revisit your searches and listening sessions as a personal music journal." },
    fr: { title: "Historique - Echoes", description: "Revivez vos recherches et sessions d'écoute comme un journal musical personnel." },
    de: { title: "Verlauf - Echoes", description: "Erlebe deine Suchen und Hörsitzungen als persönliches Musiktagebuch." },
    es: { title: "Historial - Echoes", description: "Revive tus búsquedas y sesiones de escucha como diario musical." },
    pt: { title: "Histórico - Echoes", description: "Reviva suas buscas e sessões de escuta como diário musical." },
  },
  "/favorites": {
    it: { title: "Preferiti - Echoes", description: "I brani salvati, pronti da sincronizzare con Spotify o Apple Music." },
    en: { title: "Favorites - Echoes", description: "Your saved tracks, ready to sync with Spotify or Apple Music." },
    fr: { title: "Favoris - Echoes", description: "Vos morceaux enregistrés, prêts à synchroniser avec Spotify ou Apple Music." },
    de: { title: "Favoriten - Echoes", description: "Deine gespeicherten Tracks für Spotify oder Apple Music." },
    es: { title: "Favoritos - Echoes", description: "Tus pistas guardadas para sincronizar con Spotify o Apple Music." },
    pt: { title: "Favoritos - Echoes", description: "Suas faixas salvas para sincronizar com Spotify ou Apple Music." },
  },
  "/insights": {
    it: { title: "Insights emotivi - Echoes", description: "Il tuo profilo emotivo e i pattern di ascolto raccontati dall'AI." },
    en: { title: "Emotional insights - Echoes", description: "Your emotional profile and listening patterns told by Echoes' AI." },
    fr: { title: "Insights émotionnels - Echoes", description: "Votre profil émotionnel et vos habitudes d'écoute racontés par l'IA." },
    de: { title: "Emotionale Insights - Echoes", description: "Dein emotionales Profil und Hörgewohnheiten von der KI erzählt." },
    es: { title: "Insights emocionales - Echoes", description: "Tu perfil emocional y patrones de escucha contados por la IA." },
    pt: { title: "Insights emocionais - Echoes", description: "Seu perfil emocional e padrões de escuta contados pela IA." },
  },
  "/profile": {
    it: { title: "Profilo - Echoes", description: "Gestisci account, connessioni Spotify/Apple Music e preferenze." },
    en: { title: "Profile - Echoes", description: "Manage your account, Spotify/Apple Music connections, and preferences." },
    fr: { title: "Profil - Echoes", description: "Gérez votre compte, connexions Spotify/Apple Music et préférences." },
    de: { title: "Profil - Echoes", description: "Verwalte Konto, Spotify/Apple-Music-Verbindungen und Einstellungen." },
    es: { title: "Perfil - Echoes", description: "Gestiona cuenta, conexiones Spotify/Apple Music y preferencias." },
    pt: { title: "Perfil - Echoes", description: "Gerencie conta, conexões Spotify/Apple Music e preferências." },
  },
  "/auth": {
    it: { title: "Accedi a Echoes", description: "Accedi o registrati con email o Google per iniziare il tuo diario musicale." },
    en: { title: "Sign in to Echoes", description: "Sign in or create an account with email or Google to start your music journal." },
    fr: { title: "Connexion à Echoes", description: "Connectez-vous avec e-mail ou Google pour démarrer votre journal musical." },
    de: { title: "Bei Echoes anmelden", description: "Melde dich per E-Mail oder Google an, um dein Musiktagebuch zu starten." },
    es: { title: "Inicia sesión en Echoes", description: "Inicia sesión con email o Google para empezar tu diario musical." },
    pt: { title: "Entrar no Echoes", description: "Entre com e-mail ou Google para iniciar seu diário musical." },
  },
  "/terms": {
    it: { title: "Termini di servizio - Echoes", description: "I termini di utilizzo di Echoes." },
    en: { title: "Terms of Service - Echoes", description: "Echoes' terms of service." },
    fr: { title: "Conditions d'utilisation - Echoes", description: "Conditions d'utilisation d'Echoes." },
    de: { title: "Nutzungsbedingungen - Echoes", description: "Die Nutzungsbedingungen von Echoes." },
    es: { title: "Términos del servicio - Echoes", description: "Los términos de uso de Echoes." },
    pt: { title: "Termos de serviço - Echoes", description: "Os termos de uso do Echoes." },
  },
  "/privacy": {
    it: { title: "Privacy policy - Echoes", description: "Come Echoes gestisce i tuoi dati personali." },
    en: { title: "Privacy policy - Echoes", description: "How Echoes handles your personal data." },
    fr: { title: "Politique de confidentialité - Echoes", description: "Comment Echoes gère vos données personnelles." },
    de: { title: "Datenschutz - Echoes", description: "Wie Echoes mit deinen Daten umgeht." },
    es: { title: "Política de privacidad - Echoes", description: "Cómo Echoes gestiona tus datos." },
    pt: { title: "Política de privacidade - Echoes", description: "Como o Echoes lida com seus dados." },
  },
  "/cookies": {
    it: { title: "Cookie policy - Echoes", description: "L'utilizzo dei cookie su Echoes." },
    en: { title: "Cookie policy - Echoes", description: "How cookies are used on Echoes." },
    fr: { title: "Politique cookies - Echoes", description: "L'utilisation des cookies sur Echoes." },
    de: { title: "Cookie-Richtlinie - Echoes", description: "Verwendung von Cookies auf Echoes." },
    es: { title: "Política de cookies - Echoes", description: "Uso de cookies en Echoes." },
    pt: { title: "Política de cookies - Echoes", description: "Uso de cookies no Echoes." },
  },
};

function firstPathSegment(pathname: string): string | null {
  return pathname.split("/").filter(Boolean)[0] ?? null;
}

function stripLocalePrefix(pathname: string): string {
  const seg = firstPathSegment(pathname);
  if (seg && isSupported(seg)) {
    const rest = pathname.replace(/^\/[a-z]{2}/, "");
    return rest || "/";
  }
  return pathname || "/";
}

function resolveCopy(pathname: string, lang: SupportedUiLang): Copy {
  const stripped = stripLocalePrefix(pathname);
  if (ROUTE_COPY[stripped]) return ROUTE_COPY[stripped][lang];
  if (stripped.startsWith("/invite")) {
    const inv: Record<SupportedUiLang, Copy> = {
      it: { title: "Invito a Echoes", description: "Sei stato invitato a provare Echoes, il diario musicale AI." },
      en: { title: "You're invited to Echoes", description: "You've been invited to try Echoes, the AI music journal." },
      fr: { title: "Invitation à Echoes", description: "Vous êtes invité à essayer Echoes, le journal musical IA." },
      de: { title: "Einladung zu Echoes", description: "Du bist eingeladen, Echoes auszuprobieren." },
      es: { title: "Invitación a Echoes", description: "Te invitan a probar Echoes, el diario musical con IA." },
      pt: { title: "Convite para o Echoes", description: "Você foi convidado a experimentar o Echoes." },
    };
    return inv[lang];
  }
  return SEO_COPY[lang];
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
    const copy = resolveCopy(pathname, lang);
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
