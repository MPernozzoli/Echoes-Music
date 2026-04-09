import type { SupportedUiLang } from "@/i18n/config";
import type { LegalSection } from "./types";

const it: LegalSection[] = [
  {
    title: "1. Oggetto",
    paragraphs: [
      "La presente Cookie Policy integra l’Informativa privacy e descrive l’uso di cookie e di tecnologie di memorizzazione simili nel Servizio Echoes.",
      "Titolare del trattamento dei dati connessi al Servizio: Pernozzoli Massimo, con sede in via Gino Severini 1, 20138 Milano, P.IVA 13577530960, e-mail per la privacy: massimo.pernozzoli@widipec.it.",
      "Oltre ai cookie HTTP classici, le app web possono usare localStorage, sessionStorage e meccanismi analoghi del browser: in ambito italiano ed europeo, tali strumenti che memorizzano informazioni sul terminale dell’utente rientrano nel medesimo quadro normativo applicabile ai cookie quando comportano trattamento di dati personali o tracciamento (si veda orientamento ePR in evoluzione e normativa nazionale di recepimento). Qui di seguito li trattiamo in modo trasparente insieme ai cookie.",
    ],
  },
  {
    title: "2. Cookie e memorizzazioni strettamente necessari",
    paragraphs: [
      "Autenticazione Supabase: la libreria client Supabase, nella configurazione attuale del Servizio, utilizza lo spazio di archiviazione del browser (localStorage) per conservare la sessione e i token necessari al mantenimento dello stato di login. Sono necessari per erogare le funzionalità riservate all’utente registrato.",
      "Preferenze dell’interfaccia: tema chiaro/scuro/sistema (es. chiave `echoes-theme` tramite next-themes), lingua dell’interfaccia (`echoes_ui_language`), lingua delle descrizioni musicali, stato di conversazioni e cronologie salvate localmente per continuità dell’esperienza, identificativo di sessione anonima per collegare l’attività alle funzioni di backend prima o senza registrazione, codice referral in sospeso se presente nell’URL. Tali dati restano sul dispositivo e non sono «cookie» di profilazione verso terze parti.",
      "Cookie tecnici di componenti UI: alcune librerie di interfaccia possono impostare cookie strettamente funzionali (es. stato di pannelli laterali) con durata limitata. Nel codice base del Servizio non sono implementati cookie di analisi o pubblicitari di prima parte.",
    ],
  },
  {
    title: "3. Script e risorse di terze parti",
    paragraphs: [
      "Apple Music / MusicKit: il Servizio può caricare lo script `musickit.js` da `js-cdn.music.apple.com` per abilitare funzioni di riproduzione e libreria Apple Music quando l’utente sceglie di utilizzarle. Apple può trattare dati secondo la propria policy (https://www.apple.com/legal/privacy/).",
      "OAuth e pagamenti: l’accesso tramite Google, Apple o Microsoft e i pagamenti tramite Stripe possono reindirizzare temporaneamente a domini di tali fornitori, ove possono essere impostati cookie gestiti esclusivamente da essi. Si rimanda alle rispettive informative.",
    ],
  },
  {
    title: "4. Assenza di cookie pubblicitari di profilazione di prima parte",
    paragraphs: [
      "Alla data di ultimo aggiornamento di questa informativa, Echoes non utilizza cookie di profilazione o strumenti equivalenti per pubblicità comportamentale di prima parte. Qualora ciò cambiasse, sarà richiesto consenso ove previsto dalla legge e la presente policy sarà aggiornata.",
    ],
  },
  {
    title: "5. Base giuridica",
    paragraphs: [
      "Per memorizzazioni strettamente necessarie all’erogazione del Servizio richiesto dall’utente si fa riferimento all’esecuzione del contratto o misure precontrattuali (art. 6(1)(b) GDPR) e, per quanto riguarda eventuali cookie strettamente necessari, anche all’interesse legittimo di funzionamento sicuro del sito (art. 6(1)(f) GDPR), nel rispetto della normativa italiana applicabile (es. linee guida cookie e provvedimenti del Garante).",
      "Per strumenti non necessari che richiedono consenso, il Titolare raccoglierà il consenso preventivo tramite banner o meccanismi equivalenti prima dell’attivazione.",
    ],
  },
  {
    title: "6. Come controllare cookie e archiviazione locale",
    paragraphs: [
      "È possibile cancellare cookie e dati dei siti dalle impostazioni del browser (Chrome, Safari, Firefox, Edge, ecc.) e bloccare cookie di terze parti. La disabilitazione di cookie o dello storage locale può impedire il login o la continuità delle conversazioni.",
      "Per le impostazioni interne al Servizio (tema, lingua, opt-in sui dati di miglioramento), utilizzare la pagina Profilo / Impostazioni.",
    ],
  },
  {
    title: "7. Aggiornamenti",
    paragraphs: [
      "Questa Cookie Policy può essere modificata. La data in calce indica l’ultimo aggiornamento. Per il trattamento dei dati personali si veda l’Informativa privacy.",
    ],
  },
];

const en: LegalSection[] = [
  {
    title: "1. Purpose",
    paragraphs: [
      "This Cookie Policy supplements the Privacy Policy and explains how Echoes uses cookies and similar storage technologies.",
      "Data controller for data related to the Service: Pernozzoli Massimo, Via Gino Severini 1, 20138 Milan, Italy, VAT no. 13577530960, privacy e-mail: massimo.pernozzoli@widipec.it.",
      "In addition to classic HTTP cookies, web apps may use localStorage, sessionStorage, and similar browser mechanisms. Where they store information on your device and relate to personal data or tracking, comparable rules to cookies apply under EU and national law. We describe them transparently below.",
    ],
  },
  {
    title: "2. Strictly necessary storage",
    paragraphs: [
      "Supabase authentication: the Supabase client, as configured for the Service, uses browser storage (localStorage) to hold session tokens needed to keep you signed in. This is required for registered-user features.",
      "Interface preferences: light/dark/system theme (e.g. `echoes-theme` via next-themes), UI language (`echoes_ui_language`), description language, locally saved conversations and history for continuity, an anonymous session identifier linking activity to backend features before or without sign-up, and a pending referral code from the URL if present. These remain on your device and are not third-party profiling cookies.",
      "UI component cookies: some UI libraries may set short-lived functional cookies (e.g. sidebar state). The Service does not implement first-party analytics or advertising cookies in the baseline codebase.",
    ],
  },
  {
    title: "3. Third-party scripts",
    paragraphs: [
      "Apple Music / MusicKit: the Service may load `musickit.js` from `js-cdn.music.apple.com` when you use Apple Music features. Apple may process data under its own policy: https://www.apple.com/legal/privacy/.",
      "OAuth and payments: sign-in with Google, Apple, or Microsoft and payments via Stripe may briefly redirect to those providers’ domains, where they may set their own cookies. See their respective notices.",
    ],
  },
  {
    title: "4. No first-party advertising cookies",
    paragraphs: [
      "As of the last update below, Echoes does not use first-party behavioral advertising cookies. If that changes, consent will be obtained where required by law and this policy will be updated.",
    ],
  },
  {
    title: "5. Legal basis",
    paragraphs: [
      "Strictly necessary storage for the Service you request is based on performance of a contract or pre-contractual measures (Art. 6(1)(b) GDPR). Strictly necessary cookies may also rely on legitimate interests in secure operation (Art. 6(1)(f) GDPR), consistent with applicable national cookie rules.",
      "Non-essential tools requiring consent will be activated only after consent via a banner or equivalent mechanism.",
    ],
  },
  {
    title: "6. How to control cookies and local storage",
    paragraphs: [
      "You can delete cookies and site data and block third-party cookies in your browser settings. Disabling storage may prevent sign-in or conversation continuity.",
      "Use Profile / Settings inside the Service for theme, language, and product-improvement preferences.",
    ],
  },
  {
    title: "7. Updates",
    paragraphs: [
      "This Cookie Policy may change. The date below shows the last update. See the Privacy Policy for broader personal data processing.",
    ],
  },
];

const fr: LegalSection[] = [
  {
    title: "1. Objet",
    paragraphs: [
      "La présente politique complète la Politique de confidentialité et décrit l’usage des cookies et technologies similaires dans Echoes.",
      "Responsable du traitement : Pernozzoli Massimo, Via Gino Severini 1, 20138 Milan, Italie, TVA 13577530960, e-mail : massimo.pernozzoli@widipec.it.",
      "Outre les cookies HTTP, une application web peut utiliser localStorage, sessionStorage ou équivalents ; lorsqu’ils stockent des informations sur votre terminal, des règles comparables aux cookies peuvent s’appliquer selon le droit de l’UE et national.",
    ],
  },
  {
    title: "2. Stockage strictement nécessaire",
    paragraphs: [
      "Authentification Supabase : le client utilise le stockage du navigateur (localStorage) pour la session. Préférences : thème, langue UI (`echoes_ui_language`), langue des descriptions, conversations/historique locaux, identifiant de session anonyme, code de parrainage en attente. Pas de cookies publicitaires de première partie dans la base du Service.",
      "Certains composants UI peuvent poser des cookies fonctionnels à courte durée.",
    ],
  },
  {
    title: "3. Scripts tiers",
    paragraphs: [
      "Apple Music / MusicKit : chargement possible de `musickit.js` depuis `js-cdn.music.apple.com` — voir https://www.apple.com/legal/privacy/. OAuth (Google, Apple, Microsoft) et Stripe : redirections vers leurs domaines et cookies tiers correspondants.",
    ],
  },
  {
    title: "4. Pas de publicité comportementale de première partie",
    paragraphs: [
      "À la date de mise à jour, Echoes n’utilise pas de cookies publicitaires de profilage de première partie. Tout changement fera l’objet d’un consentement si requis et d’une mise à jour.",
    ],
  },
  {
    title: "5. Base juridique et contrôle",
    paragraphs: [
      "Stockage nécessaire à la fourniture du Service : art. 6(1)(b) RGPD ; cookies strictement nécessaires : également intérêt légitime sécurisé (art. 6(1)(f) RGPD), conformément au droit national. Outils non essentiels : consentement préalable.",
      "Gestion via les paramètres du navigateur et la page Profil / Paramètres dans l’app.",
    ],
  },
  {
    title: "6. Mises à jour",
    paragraphs: [
      "Politique susceptible d’évolution ; date ci-dessous. Voir la Politique de confidentialité pour le reste.",
    ],
  },
];

const de: LegalSection[] = [
  {
    title: "1. Gegenstand",
    paragraphs: [
      "Diese Cookie-Richtlinie ergänzt die Datenschutzerklärung und erläutert Cookies und ähnliche Speichertechnologien in Echoes.",
      "Verantwortlicher: Pernozzoli Massimo, Via Gino Severini 1, 20138 Mailand, Italien, USt-IdNr. 13577530960, Datenschutz-E-Mail: massimo.pernozzoli@widipec.it.",
      "Neben HTTP-Cookies können Web-Apps localStorage, sessionStorage o. Ä. nutzen; bei personenbezogenen oder Tracking-bezogenen Inhalten gelten vergleichbare Vorgaben nach EU- und nationalem Recht.",
    ],
  },
  {
    title: "2. Unbedingt erforderliche Speicherung",
    paragraphs: [
      "Supabase-Auth: localStorage für Sitzungstoken. Einstellungen: Theme, UI-Sprache (`echoes_ui_language`), Beschreibungssprache, lokale Chats/Verlauf, anonyme Sitzungs-ID, ausstehender Referral-Code. Keine First-Party-Werbe-Cookies in der Standardcodebasis. UI-Bibliotheken können kurzlebige funktionale Cookies setzen.",
    ],
  },
  {
    title: "3. Drittanbieter-Skripte",
    paragraphs: [
      "Apple Music / MusicKit: möglicherweise `musickit.js` von `js-cdn.music.apple.com` — https://www.apple.com/legal/privacy/. OAuth (Google, Apple, Microsoft) und Stripe: Weiterleitungen und deren Cookies.",
    ],
  },
  {
    title: "4. Keine First-Party-Verhaltenswerbung",
    paragraphs: [
      "Stand der letzten Aktualisierung: keine First-Party-Profiling-Cookies für Werbung. Änderungen nur mit Einwilligung, soweit gesetzlich erforderlich.",
    ],
  },
  {
    title: "5. Rechtsgrundlage und Steuerung",
    paragraphs: [
      "Erforderliche Speicherung für den angeforderten Dienst: Art. 6 Abs. 1 lit. b DSGVO; streng notwendige Cookies ggf. berechtigtes Interesse an sicherem Betrieb (Art. 6 Abs. 1 lit. f DSGVO) im Einklang mit nationalem Cookie-Recht. Nicht notwendige Tools: vorherige Einwilligung.",
      "Steuerung über Browsereinstellungen und Profil / Einstellungen in der App.",
    ],
  },
  {
    title: "6. Aktualisierungen",
    paragraphs: [
      "Diese Richtlinie kann geändert werden; Datum unten. Details zur Datenverarbeitung in der Datenschutzerklärung.",
    ],
  },
];

const es: LegalSection[] = [
  {
    title: "1. Objeto",
    paragraphs: [
      "Esta Política de cookies complementa la Política de privacidad y describe el uso de cookies y tecnologías similares en Echoes.",
      "Responsable del tratamiento: Pernozzoli Massimo, Via Gino Severini 1, 20138 Milán, Italia, NIF-IVA 13577530960, correo: massimo.pernozzoli@widipec.it.",
      "Además de cookies HTTP, la aplicación puede usar localStorage, sessionStorage o equivalentes; cuando almacenan información en su dispositivo, pueden aplicarse reglas similares según la normativa UE y nacional.",
    ],
  },
  {
    title: "2. Almacenamiento estrictamente necesario",
    paragraphs: [
      "Autenticación Supabase: localStorage para la sesión. Preferencias: tema, idioma UI (`echoes_ui_language`), idioma de descripciones, conversaciones/historial local, identificador de sesión anónima, código de referido pendiente. No hay cookies publicitarias de primera parte en la base del Servicio. Algunos componentes UI pueden usar cookies funcionales de corta duración.",
    ],
  },
  {
    title: "3. Scripts de terceros",
    paragraphs: [
      "Apple Music / MusicKit: posible carga de `musickit.js` desde `js-cdn.music.apple.com` — https://www.apple.com/legal/privacy/. OAuth (Google, Apple, Microsoft) y Stripe: redirecciones y cookies de esos dominios.",
    ],
  },
  {
    title: "4. Sin publicidad conductual de primera parte",
    paragraphs: [
      "En la fecha de actualización, Echoes no utiliza cookies de publicidad conductual de primera parte. Cualquier cambio requerirá consentimiento si la ley lo exige.",
    ],
  },
  {
    title: "5. Base legal y control",
    paragraphs: [
      "Almacenamiento necesario para el Servicio solicitado: art. 6(1)(b) RGPD; cookies estrictamente necesarias: también interés legítimo en un funcionamiento seguro (art. 6(1)(f) RGPD), conforme al derecho nacional. Herramientas no esenciales: consentimiento previo.",
      "Control mediante el navegador y Perfil / Ajustes en la app.",
    ],
  },
  {
    title: "6. Actualizaciones",
    paragraphs: [
      "Esta política puede modificarse; la fecha figura abajo. Consulte la Política de privacidad para el tratamiento general de datos.",
    ],
  },
];

const pt: LegalSection[] = [
  {
    title: "1. Objeto",
    paragraphs: [
      "Esta Política de cookies complementa a Política de privacidade e descreve cookies e tecnologias semelhantes no Echoes.",
      "Responsável pelo tratamento: Pernozzoli Massimo, Via Gino Severini 1, 20138 Milão, Itália, NIF-IVA 13577530960, e-mail: massimo.pernozzoli@widipec.it.",
      "Para além de cookies HTTP, a aplicação pode usar localStorage, sessionStorage ou equivalentes; quando armazenam informação no seu dispositivo, podem aplicar-se regras semelhantes ao abrigo do direito da UE e nacional.",
    ],
  },
  {
    title: "2. Armazenamento estritamente necessário",
    paragraphs: [
      "Autenticação Supabase: localStorage para a sessão. Preferências: tema, idioma UI (`echoes_ui_language`), idioma das descrições, conversas/histórico local, identificador de sessão anónima, código de referência pendente. Não há cookies publicitários de primeira parte na base do Serviço. Alguns componentes UI podem definir cookies funcionais de curta duração.",
    ],
  },
  {
    title: "3. Scripts de terceiros",
    paragraphs: [
      "Apple Music / MusicKit: possível carregamento de `musickit.js` a partir de `js-cdn.music.apple.com` — https://www.apple.com/legal/privacy/. OAuth (Google, Apple, Microsoft) e Stripe: redirecionamentos e cookies desses domínios.",
    ],
  },
  {
    title: "4. Sem publicidade comportamental de primeira parte",
    paragraphs: [
      "Na data de atualização, o Echoes não utiliza cookies de publicidade comportamental de primeira parte. Alterações futuras exigirão consentimento quando a lei o impor.",
    ],
  },
  {
    title: "5. Base legal e controlo",
    paragraphs: [
      "Armazenamento necessário para o Serviço solicitado: art. 6(1)(b) RGPD; cookies estritamente necessários: também interesse legítimo em funcionamento seguro (art. 6(1)(f) RGPD), em conformidade com o direito nacional. Ferramentas não essenciais: consentimento prévio.",
      "Controlo através do navegador e Perfil / Definições na app.",
    ],
  },
  {
    title: "6. Atualizações",
    paragraphs: [
      "Esta política pode ser alterada; a data consta abaixo. Veja a Política de privacidade para o tratamento geral de dados.",
    ],
  },
];

export const COOKIES_BY_LANG: Record<SupportedUiLang, LegalSection[]> = {
  it,
  en,
  fr,
  de,
  es,
  pt,
};

export function cookiesSectionsFor(lang: string): LegalSection[] {
  const code = lang.slice(0, 2).toLowerCase();
  const key = (["it", "en", "fr", "de", "es", "pt"] as const).find((k) => k === code) ?? "en";
  return COOKIES_BY_LANG[key];
}
