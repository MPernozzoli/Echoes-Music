# Echoes Music for the Soul

Echoes e una web app orientata alla scoperta musicale assistita da AI. L'utente descrive un umore, un ricordo, un'immagine o un'intenzione musicale e il sistema restituisce brani suggeriti, profilo emotivo, narrazione testuale e strumenti per salvare i risultati nelle proprie librerie streaming.

Il repository contiene anche una companion app iOS SwiftUI e il backend serverless su Supabase.

## Cosa fa il progetto

- Ricerca musicale conversazionale da prompt testuale o immagine.
- Modalita "I'm Feeling Lucky" per ricevere suggerimenti immediati.
- Gestione conversazioni, cronologia, preferiti e insight personali.
- Integrazione con Spotify e Apple Music.
- Acquisto piani e token tramite Stripe.
- Modalita BYO AI key per usare una chiave OpenAI personale.
- Esperienza web React/Vite e app iOS in `Echoes Music/`.

## Stack

- Frontend web: React 18, TypeScript, Vite, React Router.
- UI: Tailwind CSS, Radix UI, shadcn-style components, Sonner.
- Data fetching/state: TanStack Query, context providers custom.
- Backend: Supabase Auth, Database, Edge Functions, migrations SQL.
- Pagamenti: Stripe Checkout + Customer Portal + webhook.
- Streaming music: Spotify Web API e Apple Music / MusicKit.
- i18n: i18next.
- Test: Vitest, Testing Library, Playwright configurato.

## Struttura del repository

```text
.
├── src/                    # frontend web
├── supabase/
│   ├── functions/          # edge functions
│   └── migrations/         # schema e policy SQL
├── Echoes Music/           # app iOS SwiftUI
├── public/
└── package.json
```

Punti di ingresso principali:

- `src/App.tsx`: routing e provider principali dell'app web.
- `src/pages/Landing.tsx`: homepage e ingresso alla ricerca.
- `src/pages/Chat.tsx`: esperienza conversazionale principale.
- `supabase/functions/music-search/index.ts`: orchestrazione AI + ricerca musicale.

## Routing web principale

- `/` landing page
- `/chat` ricerca e conversazione
- `/history` cronologia
- `/favorites` preferiti
- `/insights` insight utente
- `/profile` profilo, impostazioni, streaming e AI
- `/pricing`, `/pricing/plan`, `/pricing/tokens` monetizzazione
- `/auth`, `/auth/callback`, `/spotify-callback` autenticazione e callback

## Requisiti

- Node.js 18+ consigliato
- npm oppure Bun
- progetto Supabase configurato
- account Stripe per checkout e webhook
- credenziali Spotify API
- credenziali Apple Music / MusicKit
- credenziali YouTube Data API per risultati YouTube Music opzionali

## Avvio locale

1. Installa le dipendenze:

```bash
npm install
```

oppure:

```bash
bun install
```

2. Crea il file `.env` per il frontend con almeno:

```env
VITE_SUPABASE_PROJECT_ID=your-project-id
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SPOTIFY_REDIRECT_URI=https://echoesmusic.it/spotify-callback
```

3. Avvia il frontend:

```bash
npm run dev
```

4. Build di produzione:

```bash
npm run build
```

## Variabili ambiente backend

Le Edge Functions usano variabili Supabase lato server. In base al codice attuale, le principali sono:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

STRIPE_SECRET_KEY=

SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=https://echoesmusic.it/spotify-callback

APPLE_MUSIC_PRIVATE_KEY=
APPLE_MUSIC_KEY_ID=
APPLE_MUSIC_TEAM_ID=

YOUTUBE_DATA_API_KEY=

LOVABLE_API_KEY=

BYO_AI_ENCRYPTION_KEY=
BYO_OPENAI_MODEL=gpt-4o-mini
BYO_OPENAI_VISION_MODEL=gpt-4o-mini
```

Nota:

- `LOVABLE_API_KEY` viene usata per la modalita AI gestita.
- `BYO_*` serve per la modalita "bring your own OpenAI key".
- Le credenziali Apple Music sono richieste sia per token generation sia per operazioni libreria.
- `YOUTUBE_DATA_API_KEY` abilita YouTube Music come provider di ricerca best-effort tramite YouTube Data API; in alternativa e supportata anche `YOUTUBE_MUSIC_API_KEY`.
- `SPOTIFY_REDIRECT_URI` e `VITE_SPOTIFY_REDIRECT_URI` devono coincidere con uno degli URI registrati nella Spotify Developer Dashboard: `https://echoesmusic.it/spotify-callback`.
- Per test locali Spotify richiede un loopback esplicito: usa `http://127.0.0.1:8080/spotify-callback`, non `http://localhost:8080/spotify-callback`.

## Edge Functions presenti

- `music-search`: ricerca musicale, inferenza AI, quota anonima, supporto BYO key.
- `spotify-auth`: OAuth Spotify.
- `apple-music-token`: generazione developer token Apple Music.
- `apple-music-library`: operazioni su playlist/libreria Apple Music.
- `create-checkout`: creazione sessione Stripe Checkout.
- `check-subscription`: verifica stato abbonamento.
- `customer-portal`: accesso al portale cliente Stripe.
- `stripe-webhook`: sincronizzazione eventi di billing.
- `byo-ai-settings`: gestione impostazioni AI personalizzate.

## Script utili

```bash
npm run dev
npm run build
npm run build:dev
npm run lint
npm run preview
npm run test
npm run test:watch
```

## App iOS

La cartella `Echoes Music/` contiene un'app SwiftUI con modelli, storage locale e integrazione Supabase. Apri `Echoes Music/Echoes Music.xcodeproj` in Xcode per eseguirla.

## Stato attuale del repository

- Il `README` originale era un placeholder Lovable.
- Nel repo convivono frontend web, backend Supabase e client iOS.
- E presente una configurazione `.env` locale, ma non va considerata documentazione definitiva: per setup e deploy usa valori dedicati al tuo ambiente.

## Prossimi miglioramenti consigliati

- Aggiungere un file `.env.example` senza segreti.
- Documentare schema database e policy Supabase.
- Elencare il flusso di onboarding Spotify / Apple Music.
- Descrivere la strategia token / piani Stripe lato prodotto.
