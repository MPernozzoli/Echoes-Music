import type { SupportedUiLang } from "@/i18n/config";
import type { LegalSection } from "./types";

const it: LegalSection[] = [
  {
    title: "1. Oggetto e accettazione",
    paragraphs: [
      "Il presente User Agreement disciplina l'accesso e l'utilizzo del servizio digitale Echoes (il \"Servizio\"), reso disponibile da Pernozzoli Massimo, con sede in via Gino Severini 1, 20138 Milano (Italia), P.IVA 13577530960, e-mail: massimo.pernozzoli@widipec.it.",
      "Creando un account, accedendo o utilizzando il Servizio, l'utente dichiara di aver letto e accettato i presenti termini, l'Informativa sulla privacy e l'Informativa sui cookie. Se non accetta, deve interrompere l'utilizzo del Servizio.",
    ],
  },
  {
    title: "2. Descrizione del Servizio",
    paragraphs: [
      "Echoes consente di scoprire musica tramite descrizioni testuali, preferenze e interazioni dell'utente, anche con strumenti di intelligenza artificiale. Le raccomandazioni hanno finalita' informative e di intrattenimento e non garantiscono risultati specifici.",
      "Il Servizio puo' includere funzioni gratuite, piani a pagamento, pacchetti token, cronologia, preferiti, collegamenti opzionali a Spotify e Apple Music, playlist sincronizzate e altre funzioni sperimentali o beta.",
    ],
  },
  {
    title: "3. Account e sicurezza",
    paragraphs: [
      "L'utente e' responsabile della correttezza dei dati forniti, della protezione delle credenziali e di ogni attivita' svolta tramite il proprio account. Deve comunicare tempestivamente eventuali accessi non autorizzati o usi anomali.",
      "Il Titolare puo' sospendere o limitare l'account in caso di violazione dei termini, uso abusivo, rischio per la sicurezza, frode, mancato pagamento o obbligo di legge.",
    ],
  },
  {
    title: "4. Eta' minima",
    paragraphs: [
      "Il Servizio non e' destinato a minori di 14 anni, o alla diversa eta' minima prevista dalla legge applicabile. L'utente conferma di avere l'eta' necessaria per utilizzare il Servizio o di disporre del consenso valido di chi esercita la responsabilita' genitoriale, ove richiesto.",
    ],
  },
  {
    title: "5. Regole di utilizzo",
    paragraphs: [
      "L'utente non deve usare il Servizio per finalita' illegali, fraudolente, offensive, discriminatorie, lesive di diritti altrui, per tentare accessi non autorizzati, interferire con l'infrastruttura, aggirare limiti tecnici o commerciali, estrarre dati in modo massivo, rivendere accessi non autorizzati o generare carichi anomali.",
      "L'utente mantiene la responsabilita' dei contenuti che inserisce nei prompt e nelle interazioni. Non deve inserire dati di terzi senza base legittima, segreti, credenziali, dati altamente sensibili o contenuti che non ha diritto di trattare.",
    ],
  },
  {
    title: "6. Piani, token e pagamenti",
    paragraphs: [
      "Le funzioni a pagamento, ove disponibili, sono descritte nelle pagine di prezzo o checkout. Prezzi, limiti, token inclusi e funzionalita' possono variare nel tempo; le condizioni applicabili sono quelle mostrate al momento dell'acquisto o del rinnovo.",
      "I pagamenti sono gestiti tramite Stripe o altro prestatore indicato. Echoes non memorizza il numero completo della carta. Abbonamenti e rinnovi possono essere gestiti tramite la pagina profilo o il portale di billing, quando disponibile.",
      "Salvo diversa previsione obbligatoria di legge o indicazione espressa, token e crediti digitali non sono convertibili in denaro, non sono trasferibili e possono scadere o essere limitati secondo il piano applicabile.",
    ],
  },
  {
    title: "7. Recesso, rimborsi e cancellazione",
    paragraphs: [
      "Gli utenti consumatori dispongono dei diritti previsti dalla normativa applicabile. Quando l'utente richiede l'esecuzione immediata di contenuti o servizi digitali e vi acconsente, il diritto di recesso puo' essere limitato nei casi consentiti dalla legge.",
      "Le richieste di rimborso sono valutate secondo la legge applicabile, le condizioni del piano acquistato e le policy del gestore pagamenti. La cancellazione dell'account puo' comportare perdita di cronologia, preferiti, token residui o impostazioni, salvo obblighi di conservazione.",
    ],
  },
  {
    title: "8. Servizi terzi",
    paragraphs: [
      "Spotify, Apple Music, provider OAuth, Stripe, Supabase e altri servizi terzi operano secondo termini e informative propri. L'integrazione con tali servizi puo' richiedere autorizzazioni, abbonamenti o disponibilita' territoriale e puo' essere modificata o interrotta da terzi.",
      "Echoes non e' responsabile per contenuti, cataloghi, disponibilita', decisioni commerciali, interruzioni o trattamenti effettuati autonomamente dai servizi terzi.",
    ],
  },
  {
    title: "9. Proprieta' intellettuale",
    paragraphs: [
      "Il Servizio, il marchio Echoes, l'interfaccia, il software, le grafiche, i testi e gli elementi originali sono protetti dalle norme applicabili. All'utente e' concessa una licenza personale, limitata, revocabile, non esclusiva e non trasferibile per usare il Servizio secondo i presenti termini.",
      "I brani, metadati, artwork e contenuti musicali appartengono ai rispettivi titolari e possono essere soggetti a licenze e restrizioni dei servizi di streaming o delle piattaforme che li rendono disponibili.",
    ],
  },
  {
    title: "10. Disponibilita', modifiche e beta",
    paragraphs: [
      "Il Servizio puo' evolvere, essere aggiornato, sospeso, limitato o interrotto, anche per manutenzione, sicurezza, cambiamenti normativi, scelte tecniche o indisponibilita' di fornitori terzi. Alcune funzioni possono essere sperimentali, beta o non disponibili per tutti gli utenti.",
    ],
  },
  {
    title: "11. Limitazioni di responsabilita'",
    paragraphs: [
      "Nei limiti massimi consentiti dalla legge, il Servizio e' fornito senza garanzia di continuita', assenza di errori o idoneita' a uno scopo particolare. Nulla nei presenti termini limita responsabilita' che non possono essere escluse per legge.",
      "Echoes non garantisce che le raccomandazioni siano accurate, complete, gradite o disponibili su ogni piattaforma di streaming.",
    ],
  },
  {
    title: "12. Privacy e cookie",
    paragraphs: [
      "Il trattamento dei dati personali e l'uso di cookie o tecnologie simili sono descritti nell'Informativa sulla privacy e nell'Informativa sui cookie, che costituiscono parte del quadro contrattuale e informativo del Servizio.",
    ],
  },
  {
    title: "13. Legge applicabile e foro",
    paragraphs: [
      "I presenti termini sono regolati dalla legge italiana, fatto salvo ogni diritto inderogabile riconosciuto al consumatore dalla legge del Paese di residenza abituale. Per gli utenti consumatori resta competente il foro previsto dalla normativa applicabile.",
    ],
  },
  {
    title: "14. Modifiche ai termini e contatti",
    paragraphs: [
      "I presenti termini possono essere aggiornati per ragioni legali, tecniche, commerciali o organizzative. La data di ultimo aggiornamento e' indicata nella pagina. L'uso continuato del Servizio dopo la pubblicazione degli aggiornamenti comporta accettazione delle modifiche, salvo diversa comunicazione richiesta dalla legge.",
      "Per domande sui termini o sul Servizio: massimo.pernozzoli@widipec.it.",
    ],
  },
];

const en: LegalSection[] = [
  {
    title: "1. Scope and acceptance",
    paragraphs: [
      "This User Agreement governs access to and use of the Echoes digital service (the \"Service\"), provided by Pernozzoli Massimo, Via Gino Severini 1, 20138 Milan, Italy, VAT no. 13577530960, e-mail: massimo.pernozzoli@widipec.it.",
      "By creating an account, signing in, or using the Service, you agree to these terms, the Privacy Policy, and the Cookie Policy. If you do not agree, you must stop using the Service.",
    ],
  },
  {
    title: "2. Service description",
    paragraphs: [
      "Echoes helps users discover music from text descriptions, preferences, and interactions, including through AI-assisted features. Recommendations are informational and entertainment-oriented and do not guarantee any specific result.",
      "The Service may include free features, paid plans, token packs, history, favorites, optional Spotify and Apple Music connections, playlist sync, and experimental or beta features.",
    ],
  },
  {
    title: "3. Account and security",
    paragraphs: [
      "You are responsible for the accuracy of information you provide, protecting credentials, and activity under your account. You must promptly report unauthorized access or suspicious use.",
      "Echoes may suspend or limit an account for breach of these terms, abusive use, security risk, fraud, non-payment, or legal obligation.",
    ],
  },
  {
    title: "4. Minimum age",
    paragraphs: [
      "The Service is not directed to children under 14, or any higher minimum age required by applicable law. You confirm that you meet the required age or have valid parental consent where required.",
    ],
  },
  {
    title: "5. Acceptable use",
    paragraphs: [
      "You must not use the Service for unlawful, fraudulent, offensive, discriminatory, or rights-infringing purposes; attempt unauthorized access; interfere with infrastructure; bypass technical or commercial limits; scrape at scale; resell unauthorized access; or generate abnormal load.",
      "You remain responsible for content you submit in prompts and interactions. Do not submit third-party data without a lawful basis, secrets, credentials, highly sensitive data, or content you are not entitled to process.",
    ],
  },
  {
    title: "6. Plans, tokens, and payments",
    paragraphs: [
      "Paid features, where available, are described on pricing or checkout pages. Prices, limits, included tokens, and features may change; the terms shown at purchase or renewal apply.",
      "Payments are handled by Stripe or another indicated provider. Echoes does not store full card numbers. Subscriptions and renewals can be managed from profile or billing portal pages where available.",
      "Unless required by law or expressly stated, tokens and digital credits are not redeemable for cash, are not transferable, and may expire or be limited under the applicable plan.",
    ],
  },
  {
    title: "7. Withdrawal, refunds, and deletion",
    paragraphs: [
      "Consumers have the rights provided by applicable law. Where you request immediate performance of digital content or services and consent to it, the withdrawal right may be limited where permitted by law.",
      "Refund requests are assessed under applicable law, the purchased plan terms, and payment-provider policies. Account deletion may result in loss of history, favorites, remaining tokens, and settings, subject to legal retention duties.",
    ],
  },
  {
    title: "8. Third-party services",
    paragraphs: [
      "Spotify, Apple Music, OAuth providers, Stripe, Supabase, and other third-party services operate under their own terms and notices. Integrations may require permissions, subscriptions, regional availability, and may be changed or discontinued by third parties.",
      "Echoes is not responsible for third-party content, catalogues, availability, business decisions, outages, or processing carried out independently by those services.",
    ],
  },
  {
    title: "9. Intellectual property",
    paragraphs: [
      "The Service, Echoes brand, interface, software, graphics, texts, and original elements are protected by applicable law. You receive a personal, limited, revocable, non-exclusive, non-transferable license to use the Service under these terms.",
      "Tracks, metadata, artwork, and music content belong to their respective rights holders and may be subject to streaming-service or platform restrictions.",
    ],
  },
  {
    title: "10. Availability, changes, and beta features",
    paragraphs: [
      "The Service may evolve, be updated, suspended, limited, or discontinued for maintenance, security, legal, technical, business, or third-party provider reasons. Some features may be experimental, beta, or unavailable to some users.",
    ],
  },
  {
    title: "11. Liability limitations",
    paragraphs: [
      "To the maximum extent permitted by law, the Service is provided without guarantees of uninterrupted availability, error-free operation, or fitness for a particular purpose. Nothing in these terms limits liability that cannot legally be excluded.",
      "Echoes does not guarantee that recommendations will be accurate, complete, liked by you, or available on every streaming platform.",
    ],
  },
  {
    title: "12. Privacy and cookies",
    paragraphs: [
      "Personal data processing and the use of cookies or similar technologies are described in the Privacy Policy and Cookie Policy, which form part of the Service's contractual and informational framework.",
    ],
  },
  {
    title: "13. Governing law",
    paragraphs: [
      "These terms are governed by Italian law, without prejudice to mandatory consumer protections under the law of your habitual residence. Consumer users may rely on the competent forum required by applicable law.",
    ],
  },
  {
    title: "14. Changes and contact",
    paragraphs: [
      "These terms may be updated for legal, technical, commercial, or organizational reasons. The last updated date appears on the page. Continued use after publication of updates means acceptance of the changes, unless the law requires otherwise.",
      "Questions about these terms or the Service: massimo.pernozzoli@widipec.it.",
    ],
  },
];

const fr: LegalSection[] = [
  {
    title: "1. Acceptation",
    paragraphs: [
      "Les presentes conditions regissent l'utilisation d'Echoes, service fourni par Pernozzoli Massimo, Via Gino Severini 1, 20138 Milan, Italie, TVA 13577530960, e-mail : massimo.pernozzoli@widipec.it.",
      "En creant un compte ou en utilisant le Service, vous acceptez ces conditions, la Politique de confidentialite et la Politique relative aux cookies.",
    ],
  },
  {
    title: "2. Service, compte et usage",
    paragraphs: [
      "Echoes propose une decouverte musicale assistee par IA, avec fonctions gratuites ou payantes, jetons, historique, favoris et connexions optionnelles a Spotify ou Apple Music.",
      "Vous etes responsable de votre compte, de vos identifiants et des contenus saisis. Il est interdit d'utiliser le Service de maniere illegale, abusive, frauduleuse, portant atteinte a des droits ou perturbant l'infrastructure.",
    ],
  },
  {
    title: "3. Paiements et services tiers",
    paragraphs: [
      "Les offres payantes sont decrites au moment de l'achat. Les paiements sont traites par Stripe ou un fournisseur indique ; Echoes ne stocke pas le numero complet de carte. Les jetons ne sont pas convertibles en argent sauf obligation legale.",
      "Spotify, Apple Music, OAuth, Stripe, Supabase et autres tiers appliquent leurs propres conditions et politiques. Leurs catalogues, disponibilites et traitements autonomes ne dependent pas d'Echoes.",
    ],
  },
  {
    title: "4. Droits, disponibilite et responsabilite",
    paragraphs: [
      "Le Service et ses recommandations peuvent evoluer, etre suspendus ou comporter des fonctions beta. Aucune garantie n'est donnee quant a la continuite, l'absence d'erreurs ou la disponibilite de chaque morceau, dans les limites permises par la loi.",
      "Les contenus, marques, logiciels et elements originaux d'Echoes sont proteges. Les contenus musicaux appartiennent a leurs titulaires respectifs.",
    ],
  },
  {
    title: "5. Loi applicable et contact",
    paragraphs: [
      "Les conditions sont regies par le droit italien, sous reserve des protections imperatives du consommateur dans son pays de residence. Contact : massimo.pernozzoli@widipec.it.",
    ],
  },
];

const de: LegalSection[] = [
  {
    title: "1. Annahme",
    paragraphs: [
      "Diese Bedingungen regeln die Nutzung von Echoes, bereitgestellt von Pernozzoli Massimo, Via Gino Severini 1, 20138 Mailand, Italien, USt-IdNr. 13577530960, E-Mail: massimo.pernozzoli@widipec.it.",
      "Mit Kontoerstellung, Anmeldung oder Nutzung akzeptieren Sie diese Bedingungen, die Datenschutzerklaerung und die Cookie-Richtlinie.",
    ],
  },
  {
    title: "2. Dienst, Konto und Nutzung",
    paragraphs: [
      "Echoes bietet KI-gestuetzte Musikentdeckung mit kostenlosen und kostenpflichtigen Funktionen, Tokens, Verlauf, Favoriten und optionalen Verbindungen zu Spotify oder Apple Music.",
      "Sie sind fuer Ihr Konto, Zugangsdaten und eingegebene Inhalte verantwortlich. Rechtswidrige, missbraeuchliche, betruegerische, rechteverletzende oder infrastrukturschaedigende Nutzung ist untersagt.",
    ],
  },
  {
    title: "3. Zahlungen und Drittanbieter",
    paragraphs: [
      "Kostenpflichtige Angebote werden beim Kauf beschrieben. Zahlungen erfolgen ueber Stripe oder angegebene Anbieter; Echoes speichert keine vollstaendigen Kartennummern. Tokens sind nicht gegen Geld einloesbar, soweit nicht gesetzlich vorgeschrieben.",
      "Spotify, Apple Music, OAuth-Anbieter, Stripe, Supabase und andere Dritte unterliegen eigenen Bedingungen und Hinweisen. Kataloge, Verfuegbarkeit und eigenstaendige Datenverarbeitung dieser Dienste liegen nicht bei Echoes.",
    ],
  },
  {
    title: "4. Rechte, Verfuegbarkeit und Haftung",
    paragraphs: [
      "Der Dienst und Empfehlungen koennen sich aendern, ausgesetzt werden oder Beta-Funktionen enthalten. Soweit gesetzlich zulaessig, wird keine ununterbrochene, fehlerfreie oder fuer jeden Zweck geeignete Leistung garantiert.",
      "Echoes-Inhalte, Marke, Software und Originalelemente sind geschuetzt. Musikinhalte gehoeren den jeweiligen Rechteinhabern.",
    ],
  },
  {
    title: "5. Recht und Kontakt",
    paragraphs: [
      "Es gilt italienisches Recht, vorbehaltlich zwingender Verbraucherschutzrechte am gewoehnlichen Aufenthaltsort. Kontakt: massimo.pernozzoli@widipec.it.",
    ],
  },
];

const es: LegalSection[] = [
  {
    title: "1. Aceptacion",
    paragraphs: [
      "Estos terminos regulan el uso de Echoes, servicio prestado por Pernozzoli Massimo, Via Gino Severini 1, 20138 Milan, Italia, NIF-IVA 13577530960, correo: massimo.pernozzoli@widipec.it.",
      "Al crear una cuenta, iniciar sesion o usar el Servicio, aceptas estos terminos, la Politica de privacidad y la Politica de cookies.",
    ],
  },
  {
    title: "2. Servicio, cuenta y uso",
    paragraphs: [
      "Echoes ofrece descubrimiento musical asistido por IA, con funciones gratuitas o de pago, tokens, historial, favoritos y conexiones opcionales con Spotify o Apple Music.",
      "Eres responsable de tu cuenta, credenciales y contenido introducido. No se permite uso ilegal, abusivo, fraudulento, infractor de derechos, interferencia tecnica, elusion de limites o extraccion masiva.",
    ],
  },
  {
    title: "3. Pagos y terceros",
    paragraphs: [
      "Las ofertas de pago se describen al comprar. Los pagos los procesa Stripe u otro proveedor indicado; Echoes no almacena el numero completo de tarjeta. Los tokens no son canjeables por dinero salvo obligacion legal.",
      "Spotify, Apple Music, proveedores OAuth, Stripe, Supabase y otros terceros aplican sus propios terminos y politicas. Sus catalogos, disponibilidad y tratamientos autonomos no dependen de Echoes.",
    ],
  },
  {
    title: "4. Derechos, disponibilidad y responsabilidad",
    paragraphs: [
      "El Servicio y sus recomendaciones pueden cambiar, suspenderse o incluir funciones beta. En la medida permitida por la ley, no se garantiza continuidad, ausencia de errores ni disponibilidad de cada pista.",
      "La marca, software y elementos originales de Echoes estan protegidos. Los contenidos musicales pertenecen a sus titulares.",
    ],
  },
  {
    title: "5. Ley y contacto",
    paragraphs: [
      "Rige la ley italiana, sin perjuicio de protecciones imperativas del consumidor en su pais de residencia. Contacto: massimo.pernozzoli@widipec.it.",
    ],
  },
];

const pt: LegalSection[] = [
  {
    title: "1. Aceitacao",
    paragraphs: [
      "Estes termos regulam o uso do Echoes, servico prestado por Pernozzoli Massimo, Via Gino Severini 1, 20138 Milao, Italia, NIF-IVA 13577530960, e-mail: massimo.pernozzoli@widipec.it.",
      "Ao criar conta, iniciar sessao ou usar o Servico, aceita estes termos, a Politica de privacidade e a Politica de cookies.",
    ],
  },
  {
    title: "2. Servico, conta e utilizacao",
    paragraphs: [
      "O Echoes oferece descoberta musical assistida por IA, com funcionalidades gratuitas ou pagas, tokens, historico, favoritos e ligacoes opcionais ao Spotify ou Apple Music.",
      "E responsavel pela conta, credenciais e conteudos inseridos. E proibida utilizacao ilegal, abusiva, fraudulenta, violadora de direitos, interferencia tecnica, contorno de limites ou recolha massiva.",
    ],
  },
  {
    title: "3. Pagamentos e terceiros",
    paragraphs: [
      "Ofertas pagas sao descritas no momento da compra. Pagamentos sao tratados pela Stripe ou fornecedor indicado; o Echoes nao guarda o numero completo do cartao. Tokens nao sao convertiveis em dinheiro salvo obrigacao legal.",
      "Spotify, Apple Music, fornecedores OAuth, Stripe, Supabase e outros terceiros aplicam os seus proprios termos e politicas. Catalogos, disponibilidade e tratamentos autonomos desses servicos nao dependem do Echoes.",
    ],
  },
  {
    title: "4. Direitos, disponibilidade e responsabilidade",
    paragraphs: [
      "O Servico e as recomendacoes podem mudar, ser suspensos ou incluir funcionalidades beta. Na medida permitida por lei, nao se garante continuidade, ausencia de erros ou disponibilidade de cada faixa.",
      "Marca, software e elementos originais do Echoes sao protegidos. Conteudos musicais pertencem aos respetivos titulares.",
    ],
  },
  {
    title: "5. Lei e contacto",
    paragraphs: [
      "Aplica-se a lei italiana, sem prejuizo de protecoes imperativas do consumidor no pais de residencia. Contacto: massimo.pernozzoli@widipec.it.",
    ],
  },
];

export const TERMS_BY_LANG: Record<SupportedUiLang, LegalSection[]> = {
  it,
  en,
  fr,
  de,
  es,
  pt,
};

export function termsSectionsFor(lang: string): LegalSection[] {
  const code = lang.slice(0, 2).toLowerCase();
  const key = (["it", "en", "fr", "de", "es", "pt"] as const).find((k) => k === code) ?? "en";
  return TERMS_BY_LANG[key];
}
