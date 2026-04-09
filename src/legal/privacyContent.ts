import type { SupportedUiLang } from "@/i18n/config";
import type { LegalSection } from "./types";

const it: LegalSection[] = [
  {
    title: "1. Titolare del trattamento e contatti",
    paragraphs: [
      "Il presente documento disciplina il trattamento dei dati personali effettuato nell’ambito del servizio digitale Echoes (di seguito, il «Servizio»), reso disponibile tramite applicazione web.",
      "Il Titolare del trattamento è Pernozzoli Massimo, con sede in via Gino Severini 1, 20138 Milano (Italia), P.IVA 13577530960, e-mail per la privacy: massimo.pernozzoli@widipec.it (di seguito, il «Titolare»). Per esercitare i diritti di cui agli artt. 15–22 GDPR o per qualsiasi richiesta relativa al trattamento dei dati personali, l’interessato può scrivere a massimo.pernozzoli@widipec.it, utilizzare i recapiti resi disponibili sul sito o nell’app, ovvero a mezzo posta all’indirizzo sopra indicato.",
      "Eventuale Responsabile della protezione dei dati (DPO), se nominato, è raggiungibile agli stessi canali o all’indirizzo indicato dal Titolare in sede di informativa aggiuntiva.",
    ],
  },
  {
    title: "2. Ambito e definizioni",
    paragraphs: [
      "Echoes consente la ricerca e la scoperta di brani musicali sulla base di descrizioni in linguaggio naturale (testuali), con funzioni di collegamento a servizi di streaming (es. Spotify, Apple Music) e, ove previsto, acquisto di piani o pacchetti tramite pagamento elettronico.",
      "«Dati personali»: qualsiasi informazione riguardante una persona fisica identificata o identificabile. «Trattamento»: qualsiasi operazione su dati personali (raccolta, registrazione, organizzazione, conservazione, consultazione, comunicazione, cancellazione, ecc.). «Interessato»: l’utente del Servizio.",
    ],
  },
  {
    title: "3. Categorie di dati trattati",
    paragraphs: [
      "Dati di account e autenticazione: identificativo utente, indirizzo e-mail, eventuali nome e immagine profilo forniti dal provider di login scelto (es. Google, Apple, Microsoft) tramite il flusso OAuth gestito dal framework di autenticazione integrato nell’app (Lovable Cloud Auth) e sincronizzato con il backend Supabase.",
      "Dati di utilizzo del Servizio: testo delle richieste («prompt»), metadati della conversazione, esiti delle ricerche, brani proposti, interazioni (es. riproduzione, preferiti, feedback), impostazioni dell’interfaccia (lingua UI, lingua descrizioni, tema), identificativo di sessione anonima generato localmente sul dispositivo e associato alle attività fino all’eventuale collegamento con l’account.",
      "Dati di miglioramento del prodotto (facoltativi): se l’utente attiva l’opzione nelle impostazioni, possono essere raccolti ed elaborati eventi aggregati o pseudonimizzati finalizzati al miglioramento degli algoritmi e delle raccomandazioni, nel rispetto delle scelte dell’utente.",
      "Dati di collegamento a terze parti musicali: token OAuth e metadati necessari all’integrazione con Spotify e/o Apple Music (es. playlist sincronizzate, diritti di riproduzione), nei limiti autorizzati dall’utente presso ciascun provider.",
      "Dati di pagamento: importi, piano sottoscritto, identificativi cliente/abbonamento presso il gestore pagamenti (Stripe). I dati della carta di pagamento sono trattati direttamente da Stripe; Echoes non memorizza il numero completo della carta.",
      "Dati tecnici: log di sicurezza e diagnostica lato server, indirizzo IP, user agent, timestamp delle richieste, ID di correlazione, necessari a erogazione, sicurezza e conformità.",
    ],
  },
  {
    title: "4. Finalità, basi giuridiche e natura del trattamento",
    paragraphs: [
      "Erogazione del Servizio, gestione dell’account, adempimento delle richieste dell’utente (art. 6(1)(b) GDPR — esecuzione del contratto o misure precontrattuali). Include ricerca musicale, salvataggio cronologia e preferiti, gestione crediti/token, collegamenti opzionali a Spotify/Apple Music.",
      "Adempimenti contabili, fiscali e di conservazione documentale connessi ai pagamenti (art. 6(1)(c) GDPR — obbligo legale, ove applicabile).",
      "Sicurezza delle reti e dei sistemi, prevenzione frodi, abuse detection, continuità operativa (art. 6(1)(f) GDPR — legittimo interesse del Titolare, bilanciato con diritti dell’interessato).",
      "Analisi aggregate o pseudonimizzata per miglioramento del prodotto e dell’esperienza, solo ove abilitata dall’utente nelle impostazioni (art. 6(1)(a) GDPR — consenso, revocabile in qualsiasi momento senza pregiudicare la liceità del trattamento basata sul consenso prima della revoca).",
      "Comunicazioni strettamente necessarie inerenti al Servizio (es. conferme transazionali) salvo diversa base giuridica per comunicazioni promozionali, ove introdotte in futuro con consenso o soft opt-in conforme alla normativa applicabile.",
      "Il Servizio utilizza modelli o logiche di intelligenza artificiale per interpretare il testo libero e proporre brani. Tale elaborazione costituisce trattamento automatizzato dei dati inseriti dall’utente; non si profila, salvo diversa informativa, una decisione che produca effetti giuridici o incida in modo analogo significativo sulla persona unicamente sulla base di trattamento automatizzato (art. 22 GDPR), salvo obblighi di legge.",
    ],
  },
  {
    title: "5. Modalità del trattamento",
    paragraphs: [
      "I dati sono trattati con strumenti elettronici, secondo logiche correlate alle finalità indicate, mediante backend ospitato su infrastruttura Supabase (database, funzioni serverless, autenticazione), con misure di sicurezza tecniche e organizzative adeguate al rischio.",
      "Sul dispositivo dell’utente possono essere memorizzati dati in localStorage o strumenti equivalenti del browser (es. conversazioni, preferenze, token di sessione Supabase, tema, lingua). Tali memorizzazioni sono necessarie o funzionali al funzionamento dell’app come descritto nella Cookie Policy.",
    ],
  },
  {
    title: "6. Destinatari e categorie di responsabili",
    paragraphs: [
      "I dati possono essere comunicati a fornitori che trattano dati per conto del Titolare in qualità di Responsabili del trattamento (art. 28 GDPR), tra cui, in base all’implementazione attuale del Servizio: Supabase Inc. (infrastruttura backend e autenticazione); Stripe, Inc. o affiliate (pagamenti e portale cliente); fornitori di autenticazione OAuth (Google LLC, Apple Inc., Microsoft Corporation) per il solo login; Spotify AB e Apple Inc. (o affiliate) quando l’utente collega esplicitamente l’account per riproduzione o sincronizzazione playlist.",
      "Il Titolare richiede contratti di nomina e garanzie contrattuali adeguate. I link alle informative privacy dei principali fornitori sono: https://supabase.com/privacy, https://stripe.com/privacy, https://policies.google.com/privacy, https://www.apple.com/legal/privacy/, https://privacy.microsoft.com, https://www.spotify.com/legal/privacy-policy/.",
      "Altri fornitori (hosting DNS, posta, monitoraggio) possono essere aggiunti: saranno elencati in aggiornamenti della presente informativa o in informative specifiche.",
    ],
  },
  {
    title: "7. Trasferimenti verso Paesi terzi",
    paragraphs: [
      "Alcuni fornitori possono trattare dati in Paesi extra-UE/SEE. In tal caso il Titolare adotta garanzie adeguate ai sensi degli artt. 44–49 GDPR (decisioni di adeguatezza della Commissione, Clausole contrattuali tipo approvate dalla Commissione UE, o altre misure riconosciute). Copia delle garanzie può essere richiesta contattando il Titolare.",
    ],
  },
  {
    title: "8. Periodo di conservazione",
    paragraphs: [
      "I dati sono conservati per il tempo necessario alle finalità per cui sono stati raccolti, salvo obblighi di legge di conservazione più lunghi (es. documentazione fiscale).",
      "Dati di account: per la durata del rapporto contrattuale e, dopo la cessazione, per il periodo necessario a adempimenti legali, gestione reclami e tutela giudiziaria.",
      "Log tecnici: secondo policy di rotazione e necessità di sicurezza (tipicamente da pochi giorni a mesi, salvo incidenti o obblighi probatori).",
      "Dati anonimizzati o aggregati non costituiscono dati personali e possono essere conservati oltre i termini sopra.",
    ],
  },
  {
    title: "9. Diritti dell’interessato",
    paragraphs: [
      "Ai sensi degli artt. 15–22 GDPR, l’interessato può esercitare i diritti di accesso, rettifica, cancellazione («diritto all’oblio»), limitazione del trattamento, portabilità (ove applicabile), opposizione al trattamento basato su legittimo interesse, e revoca del consenso ove prestato.",
      "Per l’esercizio dei diritti l’interessato può scrivere a massimo.pernozzoli@widipec.it o utilizzare gli altri contatti del Titolare. Il Titolare risponde entro un mese, prorogabile secondo legge.",
      "L’interessato ha il diritto di proporre reclamo all’Autorità Garante per la protezione dei dati personali (www.garanteprivacy.it) o all’autorità competente dello Stato membro di residenza o del luogo in cui si è verificata la presunta violazione.",
    ],
  },
  {
    title: "10. Sicurezza",
    paragraphs: [
      "Il Titolare adotta misure tecniche e organizzative appropriate (controllo accessi, cifratura in transito ove applicabile, segregazione ambienti, aggiornamenti di sicurezza, formazione del personale autorizzato). Nessun sistema è privo di rischio: l’utente è invitato a proteggere le proprie credenziali e il dispositivo.",
    ],
  },
  {
    title: "11. Minori",
    paragraphs: [
      "Il Servizio non è diretto a minori di 14 anni (o all’età minima prevista dalla legge applicabile). Il Titolare non raccoglie consapevolmente dati di minori: se venisse a conoscenza di trattamenti non consentiti, provvederà alla cancellazione tempestiva.",
    ],
  },
  {
    title: "12. Modifiche",
    paragraphs: [
      "La presente informativa può essere aggiornata per adeguamenti normativi, organizzativi o tecnologici. La data di ultimo aggiornamento è indicata in calce. Si consiglia di consultarla periodicamente.",
    ],
  },
];

const en: LegalSection[] = [
  {
    title: "1. Data controller and contact",
    paragraphs: [
      "This notice describes how personal data are processed in connection with the Echoes digital service (the «Service»), offered as a web application.",
      "The data controller is Pernozzoli Massimo, with registered address at Via Gino Severini 1, 20138 Milan, Italy, VAT no. 13577530960, privacy e-mail: massimo.pernozzoli@widipec.it (the «controller»). To exercise your rights under Articles 15–22 GDPR or for any request relating to personal data processing, you may e-mail massimo.pernozzoli@widipec.it, use other contact options published on the website or in the app, or write by post to the address above.",
      "Where a Data Protection Officer (DPO) has been appointed, they can be reached through the channels indicated by the controller.",
    ],
  },
  {
    title: "2. Scope and definitions",
    paragraphs: [
      "Echoes provides AI-assisted music discovery based on free-text descriptions, with optional connections to streaming providers (e.g. Spotify, Apple Music) and, where offered, purchase of plans or token packs via electronic payment.",
      "«Personal data» means any information relating to an identified or identifiable natural person. «Processing» means any operation on personal data (collection, recording, storage, disclosure, erasure, etc.). «Data subject» means the user of the Service.",
    ],
  },
  {
    title: "3. Categories of data processed",
    paragraphs: [
      "Account and authentication data: user identifier, email address, and name or profile image supplied by the chosen login provider (e.g. Google, Apple, Microsoft) through the OAuth flow provided by the integrated authentication layer (Lovable Cloud Auth) and synchronized with the Supabase backend.",
      "Service usage data: text prompts, conversation metadata, search records, suggested tracks, interactions (e.g. playback, favorites, feedback), interface settings (UI language, description language, theme), a locally generated anonymous session identifier linked to activity until tied to a logged-in account.",
      "Product improvement data (optional): where enabled in settings, aggregated or pseudonymized events may be collected to improve recommendations and algorithms, subject to the user’s choice.",
      "Third-party music connection data: OAuth tokens and metadata required for Spotify and/or Apple Music integration (e.g. synced playlists, playback permissions), within the scopes authorized by the user with each provider.",
      "Payment data: amounts, plan, customer and subscription identifiers at the payment processor (Stripe). Card data are processed directly by Stripe; Echoes does not store full card numbers.",
      "Technical data: server-side security and diagnostic logs, IP address, user agent, request timestamps, correlation IDs, as needed for delivery, security, and compliance.",
    ],
  },
  {
    title: "4. Purposes, legal bases, and automated processing",
    paragraphs: [
      "Providing the Service and the account, and fulfilling user requests (Art. 6(1)(b) GDPR — performance of a contract or pre-contractual measures). This includes music search, history and favorites, token balances, and optional Spotify/Apple Music linking.",
      "Accounting, tax, and record-keeping related to payments (Art. 6(1)(c) GDPR — legal obligation, where applicable).",
      "Security of networks and systems, fraud and abuse prevention, operational continuity (Art. 6(1)(f) GDPR — legitimate interests, balanced against data subjects’ rights).",
      "Aggregated or pseudonymized analytics for product improvement only if enabled in settings (Art. 6(1)(a) GDPR — consent, withdrawable at any time without affecting lawfulness of processing based on consent before withdrawal).",
      "Service-related communications strictly necessary for the relationship (e.g. transactional confirmations), unless promotional communications are introduced in the future under a separate lawful basis.",
      "The Service uses AI or similar logic to interpret free text and suggest tracks. This involves automated processing of user input; unless otherwise stated, it does not constitute solely automated decision-making producing legal or similarly significant effects under Article 22 GDPR, except as required by law.",
    ],
  },
  {
    title: "5. How processing is carried out",
    paragraphs: [
      "Processing is performed electronically using Supabase (database, serverless functions, authentication) with technical and organizational measures appropriate to the risk.",
      "The app may store data in the browser’s localStorage or equivalent (e.g. conversations, preferences, Supabase session tokens, theme, language). These storages are described in the Cookie Policy.",
    ],
  },
  {
    title: "6. Recipients and processors",
    paragraphs: [
      "Data may be disclosed to vendors acting as processors on behalf of the controller (Art. 28 GDPR), including, based on the current implementation: Supabase Inc.; Stripe, Inc. or affiliates; OAuth identity providers (Google LLC, Apple Inc., Microsoft Corporation) for sign-in only; Spotify AB and Apple Inc. (or affiliates) when the user explicitly connects an account for playback or playlist sync.",
      "The controller relies on appropriate agreements and safeguards. Privacy notices: https://supabase.com/privacy, https://stripe.com/privacy, https://policies.google.com/privacy, https://www.apple.com/legal/privacy/, https://privacy.microsoft.com, https://www.spotify.com/legal/privacy-policy/.",
      "Additional subprocessors (e.g. email, DNS, monitoring) may be listed in updates to this notice.",
    ],
  },
  {
    title: "7. International transfers",
    paragraphs: [
      "Some providers may process data outside the EU/EEA. Where required, the controller implements appropriate safeguards under Articles 44–49 GDPR (adequacy decisions, Standard Contractual Clauses, or other recognized mechanisms). You may request a copy of relevant safeguards by contacting the controller.",
    ],
  },
  {
    title: "8. Retention",
    paragraphs: [
      "Data are kept only as long as necessary for the purposes collected, unless longer retention is required by law (e.g. tax records).",
      "Account data: for the duration of the relationship and thereafter as needed for legal obligations, claims, and defense.",
      "Technical logs: according to rotation policies and security needs (typically days to months, unless incidents require longer retention).",
      "Truly anonymized or aggregated data are not personal data and may be retained longer.",
    ],
  },
  {
    title: "9. Data subject rights",
    paragraphs: [
      "Under Articles 15–22 GDPR, you may request access, rectification, erasure, restriction, data portability (where applicable), object to processing based on legitimate interests, and withdraw consent where processing is consent-based.",
      "You may send requests to massimo.pernozzoli@widipec.it or use the controller’s other contact details. The controller responds within one month, extendable as permitted by law.",
      "You have the right to lodge a complaint with a supervisory authority, e.g. the Italian Garante (www.garanteprivacy.it) or the authority in your Member State of residence or place of the alleged infringement.",
    ],
  },
  {
    title: "10. Security",
    paragraphs: [
      "The controller implements appropriate technical and organizational measures (access control, encryption in transit where applicable, segregation, patching, training). No system is risk-free; users should protect credentials and devices.",
    ],
  },
  {
    title: "11. Children",
    paragraphs: [
      "The Service is not directed at children under 14 (or the minimum age under applicable law). The controller does not knowingly collect children’s data; if such processing is identified, it will be deleted promptly.",
    ],
  },
  {
    title: "12. Changes",
    paragraphs: [
      "This notice may be updated for legal, organizational, or technical reasons. The «last updated» date appears below. Please review it periodically.",
    ],
  },
];

const fr: LegalSection[] = [
  {
    title: "1. Responsable du traitement et contacts",
    paragraphs: [
      "Le présent document décrit le traitement des données personnelles dans le cadre du service numérique Echoes (le « Service »), proposé en application web.",
      "Le responsable du traitement est Pernozzoli Massimo, dont le siège est situé Via Gino Severini 1, 20138 Milan, Italie, numéro de TVA intracommunautaire italien 13577530960, e-mail : massimo.pernozzoli@widipec.it (le « responsable »). Pour exercer vos droits (art. 15–22 RGPD) ou pour toute demande relative au traitement : massimo.pernozzoli@widipec.it, coordonnées publiées sur le site ou dans l’application, ou courrier à l’adresse ci-dessus.",
    ],
  },
  {
    title: "2. Champ d’application",
    paragraphs: [
      "Echoes permet la découverte musicale assistée par IA à partir de texte libre, avec connexion optionnelle à des services de streaming (ex. Spotify, Apple Music) et paiement électronique pour abonnements ou packs de jetons le cas échéant.",
    ],
  },
  {
    title: "3. Catégories de données",
    paragraphs: [
      "Compte et authentification : identifiant, e-mail, nom ou image de profil fournis par le fournisseur OAuth choisi (Google, Apple, Microsoft) via Lovable Cloud Auth, synchronisé avec Supabase.",
      "Utilisation : prompts, métadonnées de conversation, recherches, titres proposés, interactions (lecture, favoris, retours), paramètres d’interface (langue UI, langue des descriptions, thème), identifiant de session anonyme local jusqu’au rattachement au compte.",
      "Amélioration produit (facultatif) : événements agrégés ou pseudonymisés si l’option est activée dans les paramètres.",
      "Streaming tiers : jetons OAuth et métadonnées nécessaires pour Spotify et/ou Apple Music dans les périmètres autorisés.",
      "Paiement : montants, formule, identifiants client/abonnement chez Stripe ; les données de carte sont traitées par Stripe ; Echoes ne stocke pas le numéro complet de carte.",
      "Données techniques : journaux serveur, adresse IP, user agent, horodatages, à des fins de sécurité et d’exploitation.",
    ],
  },
  {
    title: "4. Finalités et bases juridiques",
    paragraphs: [
      "Fourniture du Service et du compte (art. 6(1)(b) RGPD). Obligations légales liées aux paiements (art. 6(1)(c) RGPD). Sécurité et prévention des abus (art. 6(1)(f) RGPD). Amélioration du produit avec consentement si l’option est activée (art. 6(1)(a) RGPD).",
      "Le Service utilise des traitements automatisés (IA) pour interpréter le texte ; sauf mention contraire, il ne s’agit pas d’une décision automatisée produisant des effets juridiques au sens de l’art. 22 RGPD, sauf obligation légale.",
    ],
  },
  {
    title: "5. Modalités",
    paragraphs: [
      "Traitement électronique via Supabase (base de données, fonctions, authentification). Stockage local dans le navigateur (localStorage ou équivalent) pour session, préférences et conversations, comme détaillé dans la Politique cookies.",
    ],
  },
  {
    title: "6. Destinataires",
    paragraphs: [
      "Sous-traitants : Supabase, Stripe, fournisseurs OAuth (Google, Apple, Microsoft), Spotify et Apple si vous connectez un compte. Informations : https://supabase.com/privacy, https://stripe.com/privacy, https://policies.google.com/privacy, https://www.apple.com/legal/privacy/, https://privacy.microsoft.com, https://www.spotify.com/legal/privacy-policy/.",
    ],
  },
  {
    title: "7. Transferts hors UE",
    paragraphs: [
      "Le cas échéant, le responsable met en œuvre des garanties appropriées (art. 44–49 RGPD : décisions d’adéquation, clauses contractuelles types, etc.). Copie sur demande auprès du responsable.",
    ],
  },
  {
    title: "8. Conservation",
    paragraphs: [
      "Durée nécessaire aux finalités et obligations légales. Données de compte pendant la relation puis pour la défense et obligations. Journaux selon rotation. Données anonymisées peuvent être conservées au-delà.",
    ],
  },
  {
    title: "9. Droits",
    paragraphs: [
      "Accès, rectification, effacement, limitation, portabilité (si applicable), opposition, retrait du consentement (art. 15–22 RGPD). Demandes à massimo.pernozzoli@widipec.it ou selon les autres coordonnées du responsable. Réponse sous un mois. Réclamation auprès d’une autorité de contrôle (ex. CNIL en France, Garante en Italie).",
    ],
  },
  {
    title: "10. Sécurité et mineurs",
    paragraphs: [
      "Mesures techniques et organisationnelles adaptées. Le Service ne vise pas les moins de 14 ans (ou l’âge légal applicable) ; pas de collecte délibérée auprès d’enfants.",
    ],
  },
  {
    title: "11. Modifications",
    paragraphs: [
      "La présente politique peut être mise à jour ; la date de dernière mise à jour figure ci-dessous.",
    ],
  },
];

const de: LegalSection[] = [
  {
    title: "1. Verantwortlicher und Kontakt",
    paragraphs: [
      "Diese Erklärung beschreibt die Verarbeitung personenbezogener Daten im Zusammenhang mit dem digitalen Dienst Echoes (der «Dienst»), angeboten als Webanwendung.",
      "Verantwortlicher ist Pernozzoli Massimo, Anschrift Via Gino Severini 1, 20138 Mailand, Italien, italienische USt-IdNr. 13577530960, Datenschutz-E-Mail: massimo.pernozzoli@widipec.it (der «Verantwortliche»). Zur Ausübung Ihrer Rechte nach Art. 15–22 DSGVO oder bei Datenschutzanfragen: massimo.pernozzoli@widipec.it, weitere Kontaktwege auf der Website oder in der App, oder schriftlich an die obige Anschrift.",
    ],
  },
  {
    title: "2. Geltungsbereich",
    paragraphs: [
      "Echoes ermöglicht KI-gestützte Musiksuche anhand Freitext, optionale Anbindung an Streaming (z. B. Spotify, Apple Music) und ggf. elektronische Zahlung für Abos oder Token-Pakete.",
    ],
  },
  {
    title: "3. Datenkategorien",
    paragraphs: [
      "Konto/Authentifizierung: Kennung, E-Mail, ggf. Name/Profilbild des gewählten OAuth-Anbieters (Google, Apple, Microsoft) über Lovable Cloud Auth, synchronisiert mit Supabase.",
      "Nutzung: Prompts, Konversationsmetadaten, Suchvorgänge, Vorschläge, Interaktionen (Wiedergabe, Favoriten, Feedback), UI-Einstellungen (Sprache, Beschreibungssprache, Theme), anonyme Sitzungs-ID lokal bis zur Kontoverknüpfung.",
      "Produktverbesserung (optional): aggregierte/pseudonymisierte Ereignisse nur bei aktivierter Einstellung.",
      "Streaming-Dritte: OAuth-Token und Metadaten für Spotify/Apple Music im vom Nutzer erlaubten Umfang.",
      "Zahlung: Beträge, Tarif, Kunden-/Abo-IDs bei Stripe; Kartendaten verarbeitet Stripe; Echoes speichert keine vollständige Kartennummer.",
      "Technisch: Server-Logs, IP, User-Agent, Zeitstempel zu Sicherheit und Betrieb.",
    ],
  },
  {
    title: "4. Zwecke und Rechtsgrundlagen",
    paragraphs: [
      "Dienstbereitstellung und Vertrag (Art. 6 Abs. 1 lit. b DSGVO). Gesetzliche Pflichten bei Zahlungen (Art. 6 Abs. 1 lit. c DSGVO). Sicherheit und Missbrauchsprävention (Art. 6 Abs. 1 lit. f DSGVO). Produktverbesserung mit Einwilligung bei aktivierter Option (Art. 6 Abs. 1 lit. a DSGVO).",
      "Automatisierte Verarbeitung/KI zur Textauswertung; keine allein automatisierte Entscheidung mit Rechtswirkung i. S. d. Art. 22 DSGVO, sofern nicht gesetzlich vorgeschrieben.",
    ],
  },
  {
    title: "5. Art der Verarbeitung",
    paragraphs: [
      "Elektronisch über Supabase (Datenbank, Funktionen, Auth). Lokale Speicherung im Browser (localStorage o. Ä.) für Sitzung und Einstellungen, siehe Cookie-Richtlinie.",
    ],
  },
  {
    title: "6. Empfänger",
    paragraphs: [
      "Auftragsverarbeiter u. a.: Supabase, Stripe, OAuth-Anbieter (Google, Apple, Microsoft), Spotify und Apple bei Kontoverknüpfung. Hinweise: https://supabase.com/privacy, https://stripe.com/privacy, https://policies.google.com/privacy, https://www.apple.com/legal/privacy/, https://privacy.microsoft.com, https://www.spotify.com/legal/privacy-policy/.",
    ],
  },
  {
    title: "7. Drittlandübermittlungen",
    paragraphs: [
      "Wo erforderlich, geeignete Garantien nach Art. 44–49 DSGVO (Angemessenheitsbeschluss, Standardvertragsklauseln u. a.). Kopie auf Anfrage beim Verantwortlichen.",
    ],
  },
  {
    title: "8. Speicherdauer",
    paragraphs: [
      "So lange wie für die Zwecke und gesetzlichen Pflichten erforderlich. Kontodaten über die Vertragsbeziehung hinaus für Rechtsverteidigung und Pflichten. Logs mit Rotation. Anonymisierte Daten können länger gespeichert werden.",
    ],
  },
  {
    title: "9. Rechte der Betroffenen",
    paragraphs: [
      "Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit (soweit anwendbar), Widerspruch, Widerruf einer Einwilligung (Art. 15–22 DSGVO). Anträge an massimo.pernozzoli@widipec.it oder über sonstige Kontaktdaten des Verantwortlichen. Antwort innerhalb eines Monats. Beschwerde bei einer Aufsichtsbehörde.",
    ],
  },
  {
    title: "10. Sicherheit und Kinder",
    paragraphs: [
      "Angemessene technische und organisatorische Maßnahmen. Der Dienst richtet sich nicht an Kinder unter 14 Jahren (bzw. gesetzlichem Mindestalter); keine wissentliche Erhebung bei Kindern.",
    ],
  },
  {
    title: "11. Änderungen",
    paragraphs: [
      "Diese Erklärung kann aktualisiert werden; das Datum der letzten Aktualisierung steht unten.",
    ],
  },
];

const es: LegalSection[] = [
  {
    title: "1. Responsable del tratamiento y contacto",
    paragraphs: [
      "Este documento describe el tratamiento de datos personales en el servicio digital Echoes (el «Servicio»), ofrecido como aplicación web.",
      "El responsable del tratamiento es Pernozzoli Massimo, con domicilio en Via Gino Severini 1, 20138 Milán, Italia, NIF-IVA italiano 13577530960, correo electrónico para privacidad: massimo.pernozzoli@widipec.it (el «responsable»). Para ejercer los derechos del art. 15–22 RGPD o para cualquier consulta: massimo.pernozzoli@widipec.it, otros medios publicados en el sitio o la app, o correo postal a la dirección indicada.",
    ],
  },
  {
    title: "2. Ámbito",
    paragraphs: [
      "Echoes permite el descubrimiento musical asistido por IA a partir de texto libre, conexión opcional con streaming (p. ej. Spotify, Apple Music) y, si aplica, pago electrónico de planes o paquetes de tokens.",
    ],
  },
  {
    title: "3. Categorías de datos",
    paragraphs: [
      "Cuenta y autenticación: identificador, correo, nombre o imagen del proveedor OAuth elegido (Google, Apple, Microsoft) vía Lovable Cloud Auth, sincronizado con Supabase.",
      "Uso: indicaciones, metadatos de conversación, búsquedas, pistas sugeridas, interacciones (reproducción, favoritos, comentarios), ajustes de interfaz (idioma UI, idioma de descripciones, tema), identificador de sesión anónimo local hasta vincular la cuenta.",
      "Mejora del producto (opcional): eventos agregados o seudonimizados si la opción está activada.",
      "Terceros musicales: tokens OAuth y metadatos necesarios para Spotify y/o Apple Music en el ámbito autorizado.",
      "Pagos: importes, plan, identificadores de cliente/suscripción en Stripe; los datos de tarjeta los trata Stripe; Echoes no almacena el número completo de tarjeta.",
      "Técnicos: registros del servidor, IP, user agent, marcas de tiempo para seguridad y operación.",
    ],
  },
  {
    title: "4. Finalidades y bases legales",
    paragraphs: [
      "Prestación del Servicio y del contrato (art. 6(1)(b) RGPD). Obligaciones legales en pagos (art. 6(1)(c) RGPD). Seguridad y prevención de abusos (art. 6(1)(f) RGPD). Mejora del producto con consentimiento si la opción está activada (art. 6(1)(a) RGPD).",
      "Tratamiento automatizado/IA para interpretar texto; salvo indicación contraria, no constituye decisión automatizada con efectos jurídicos según el art. 22 RGPD, salvo obligación legal.",
    ],
  },
  {
    title: "5. Modalidades",
    paragraphs: [
      "Tratamiento electrónico mediante Supabase (base de datos, funciones, autenticación). Almacenamiento local en el navegador (localStorage o equivalente) para sesión y preferencias, según la Política de cookies.",
    ],
  },
  {
    title: "6. Destinatarios",
    paragraphs: [
      "Encargados del tratamiento, entre otros: Supabase, Stripe, proveedores OAuth (Google, Apple, Microsoft), Spotify y Apple si conecta una cuenta. Avisos de privacidad: https://supabase.com/privacy, https://stripe.com/privacy, https://policies.google.com/privacy, https://www.apple.com/legal/privacy/, https://privacy.microsoft.com, https://www.spotify.com/legal/privacy-policy/.",
    ],
  },
  {
    title: "7. Transferencias internacionales",
    paragraphs: [
      "Si aplica, el responsable adopta garantías adecuadas (arts. 44–49 RGPD). Copia bajo solicitud al responsable.",
    ],
  },
  {
    title: "8. Conservación",
    paragraphs: [
      "Tiempo necesario para las finalidades y obligaciones legales. Datos de cuenta durante la relación y después para obligaciones y defensa. Registros con rotación. Datos anonimizados pueden conservarse más tiempo.",
    ],
  },
  {
    title: "9. Derechos",
    paragraphs: [
      "Acceso, rectificación, supresión, limitación, portabilidad (si aplica), oposición, retirada del consentimiento (arts. 15–22 RGPD). Solicitudes a massimo.pernozzoli@widipec.it o por otros medios del responsable. Respuesta en un mes. Reclamación ante autoridad de control (p. ej. AEPD en España).",
    ],
  },
  {
    title: "10. Seguridad y menores",
    paragraphs: [
      "Medidas técnicas y organizativas adecuadas. El Servicio no está dirigido a menores de 14 años (o edad mínima aplicable); no se recogen datos de menores a sabiendas.",
    ],
  },
  {
    title: "11. Cambios",
    paragraphs: [
      "Esta política puede actualizarse; la fecha de última actualización figura al final.",
    ],
  },
];

const pt: LegalSection[] = [
  {
    title: "1. Responsável pelo tratamento e contactos",
    paragraphs: [
      "Este documento descreve o tratamento de dados pessoais no âmbito do serviço digital Echoes (o «Serviço»), disponibilizado como aplicação web.",
      "O responsável pelo tratamento é Pernozzoli Massimo, com sede em Via Gino Severini 1, 20138 Milão, Itália, NIF-IVA italiano 13577530960, e-mail de privacidade: massimo.pernozzoli@widipec.it (o «responsável»). Para exercer os direitos nos termos dos arts. 15–22 RGPD ou para qualquer pedido: massimo.pernozzoli@widipec.it, outros contactos publicados no site ou na app, ou carta para a morada indicada.",
    ],
  },
  {
    title: "2. Âmbito",
    paragraphs: [
      "O Echoes permite a descoberta musical assistida por IA com base em texto livre, ligação opcional a streaming (ex.: Spotify, Apple Music) e, quando aplicável, pagamento eletrónico de planos ou pacotes de tokens.",
    ],
  },
  {
    title: "3. Categorias de dados",
    paragraphs: [
      "Conta e autenticação: identificador, e-mail, nome ou imagem do fornecedor OAuth escolhido (Google, Apple, Microsoft) via Lovable Cloud Auth, sincronizado com Supabase.",
      "Utilização: prompts, metadados de conversa, pesquisas, faixas sugeridas, interações (reprodução, favoritos, feedback), definições de interface (idioma UI, idioma das descrições, tema), identificador de sessão anónima local até associação à conta.",
      "Melhoria do produto (opcional): eventos agregados ou pseudonimizados se a opção estiver ativada nas definições.",
      "Terceiros musicais: tokens OAuth e metadados necessários para Spotify e/ou Apple Music nos âmbitos autorizados.",
      "Pagamentos: valores, plano, identificadores de cliente/subscrição na Stripe; dados do cartão tratados pela Stripe; o Echoes não armazena o número completo do cartão.",
      "Técnicos: registos do servidor, IP, user agent, carimbos de data/hora para segurança e operação.",
    ],
  },
  {
    title: "4. Finalidades e bases legais",
    paragraphs: [
      "Prestação do Serviço e execução contratual (art. 6(1)(b) RGPD). Obrigações legais relacionadas com pagamentos (art. 6(1)(c) RGPD). Segurança e prevenção de abusos (art. 6(1)(f) RGPD). Melhoria do produto com consentimento se a opção estiver ativada (art. 6(1)(a) RGPD).",
      "Tratamento automatizado/IA para interpretar texto; salvo indicação em contrário, não constitui decisão automatizada com efeitos jurídicos ao abrigo do art. 22 RGPD, salvo obrigação legal.",
    ],
  },
  {
    title: "5. Modalidades",
    paragraphs: [
      "Tratamento eletrónico via Supabase (base de dados, funções, autenticação). Armazenamento local no navegador (localStorage ou equivalente) para sessão e preferências, conforme a Política de cookies.",
    ],
  },
  {
    title: "6. Destinatários",
    paragraphs: [
      "Subcontratantes, entre outros: Supabase, Stripe, fornecedores OAuth (Google, Apple, Microsoft), Spotify e Apple se ligar uma conta. Avisos de privacidade: https://supabase.com/privacy, https://stripe.com/privacy, https://policies.google.com/privacy, https://www.apple.com/legal/privacy/, https://privacy.microsoft.com, https://www.spotify.com/legal/privacy-policy/.",
    ],
  },
  {
    title: "7. Transferências internacionais",
    paragraphs: [
      "Quando aplicável, o responsável implementa garantias adequadas (arts. 44–49 RGPD). Cópia disponível mediante pedido ao responsável.",
    ],
  },
  {
    title: "8. Conservação",
    paragraphs: [
      "Pelo tempo necessário às finalidades e obrigações legais. Dados de conta durante a relação e depois para obrigações e defesa. Registos com rotação. Dados anonimizados podem conservar-se por mais tempo.",
    ],
  },
  {
    title: "9. Direitos",
    paragraphs: [
      "Acesso, retificação, apagamento, limitação, portabilidade (se aplicável), oposição, retirada do consentimento (arts. 15–22 RGPD). Pedidos a massimo.pernozzoli@widipec.it ou por outros contactos do responsável. Resposta no prazo de um mês. Reclamação junto de autoridade de controlo (ex.: CNPD em Portugal).",
    ],
  },
  {
    title: "10. Segurança e menores",
    paragraphs: [
      "Medidas técnicas e organizacionais adequadas. O Serviço não se dirige a menores de 14 anos (ou idade mínima aplicável); não há recolha deliberada de dados de menores.",
    ],
  },
  {
    title: "11. Alterações",
    paragraphs: [
      "Esta política pode ser atualizada; a data da última atualização consta no final.",
    ],
  },
];

export const PRIVACY_BY_LANG: Record<SupportedUiLang, LegalSection[]> = {
  it,
  en,
  fr,
  de,
  es,
  pt,
};

export function privacySectionsFor(lang: string): LegalSection[] {
  const code = lang.slice(0, 2).toLowerCase();
  const key = (["it", "en", "fr", "de", "es", "pt"] as const).find((k) => k === code) ?? "en";
  return PRIVACY_BY_LANG[key];
}
