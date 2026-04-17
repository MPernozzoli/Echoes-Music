import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { decryptApiKey, importAes256GcmKeyFromEnv } from '../_shared/byo_crypto.ts';
import {
  ByoOpenAiError,
  mapByoCodeToDbStatus,
  openAiChatCompletion,
  userMessageForByoCode,
} from '../_shared/byo_openai.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AI_MODEL = 'google/gemini-3-flash-preview';
/** USD / 1M token — stima su listino Gemini 3 Flash testo (Google AI). */
const USD_PER_MTOK_PROMPT = 0.5;
const USD_PER_MTOK_COMPLETION = 3.0;

type GatewayUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

function normalizeUsage(raw: unknown): GatewayUsage {
  if (!raw || typeof raw !== 'object') return {};
  const o = raw as Record<string, unknown>;
  const pt = Number(o.prompt_tokens);
  const ct = Number(o.completion_tokens);
  const tt = Number(o.total_tokens);
  return {
    prompt_tokens: Number.isFinite(pt) ? Math.round(pt) : undefined,
    completion_tokens: Number.isFinite(ct) ? Math.round(ct) : undefined,
    total_tokens: Number.isFinite(tt) ? Math.round(tt) : undefined,
  };
}

function estimateGemini3FlashUsd(u: GatewayUsage): number | null {
  const pt = u.prompt_tokens ?? 0;
  const ct = u.completion_tokens ?? 0;
  if (pt === 0 && ct === 0) return null;
  return (pt * USD_PER_MTOK_PROMPT + ct * USD_PER_MTOK_COMPLETION) / 1_000_000;
}

type AiInferenceRoute = { kind: 'managed' } | { kind: 'byo'; apiKey: string; model: string };

async function loadAiInferenceRoute(
  admin: SupabaseClient | null,
  userId: string | null,
  needsVision: boolean,
): Promise<AiInferenceRoute> {
  if (!userId || !admin) return { kind: 'managed' };
  const { data: row } = await admin
    .from('user_settings')
    .select('ai_provider_mode, byo_ai_provider')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!row || row.ai_provider_mode !== 'byo_key' || row.byo_ai_provider !== 'openai') {
    return { kind: 'managed' };
  }
  const { data: sec } = await admin
    .from('user_byo_ai_secrets')
    .select('iv, ciphertext')
    .eq('user_id', userId)
    .maybeSingle();
  if (!sec?.iv || !sec?.ciphertext) return { kind: 'managed' };
  const master = await importAes256GcmKeyFromEnv();
  if (!master) {
    console.error('BYO_AI_ENCRYPTION_KEY missing or invalid');
    return { kind: 'managed' };
  }
  try {
    const apiKey = (await decryptApiKey(sec.iv, sec.ciphertext, master)).trim();
    if (!apiKey) return { kind: 'managed' };
    const textModel = Deno.env.get('BYO_OPENAI_MODEL')?.trim() || 'gpt-4o-mini';
    const visionModel = Deno.env.get('BYO_OPENAI_VISION_MODEL')?.trim() || textModel;
    const model = needsVision ? visionModel : textModel;
    return { kind: 'byo', apiKey, model };
  } catch {
    return { kind: 'managed' };
  }
}

async function runInferenceCompletion(
  route: AiInferenceRoute,
  chatBody: Record<string, unknown>,
): Promise<{ data: unknown; usage: GatewayUsage; gatewayRequestId: string | null }> {
  if (route.kind === 'managed') {
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) throw new Error('LOVABLE_API_KEY not configured');
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...chatBody, model: AI_MODEL }),
    });
    if (!res.ok) {
      const status = res.status;
      const text = await res.text();
      console.error('AI gateway error:', status, text.slice(0, 400));
      if (status === 429) throw new Error('Rate limited - please try again shortly');
      if (status === 402) throw new Error('AI credits exhausted');
      throw new Error('AI interpretation failed');
    }
    const data = await res.json();
    return {
      data,
      usage: normalizeUsage(data.usage),
      gatewayRequestId: typeof data.id === 'string' ? data.id : null,
    };
  }
  const { json, requestId } = await openAiChatCompletion(route.apiKey, route.model, chatBody);
  return {
    data: json,
    usage: normalizeUsage((json as { usage?: unknown }).usage),
    gatewayRequestId: requestId,
  };
}

function httpStatusForByo(err: ByoOpenAiError): number {
  if (err.code === 'rate_limited') return 429;
  if (err.code === 'connection_failed') return 503;
  return 422;
}

async function insertAiUsage(
  admin: SupabaseClient | null,
  row: {
    user_id: string | null;
    operation: string;
    search_mode: string | null;
    usage: GatewayUsage;
    gateway_request_id?: string | null;
    provider?: string;
    model?: string;
  },
): Promise<void> {
  if (!admin) return;
  const est = estimateGemini3FlashUsd(row.usage);
  const provider = row.provider ?? 'lovable_gateway';
  const model = row.model ?? AI_MODEL;
  const { error } = await admin.from('ai_usage_events').insert({
    user_id: row.user_id,
    provider,
    model,
    operation: row.operation,
    search_mode: row.search_mode,
    prompt_tokens: row.usage.prompt_tokens ?? null,
    completion_tokens: row.usage.completion_tokens ?? null,
    total_tokens: row.usage.total_tokens ?? null,
    estimated_cost_usd: est,
    gateway_request_id: row.gateway_request_id ?? null,
  });
  if (error) console.error('ai_usage_events insert:', error);
}

async function resolveUserContext(req: Request): Promise<{ userId: string | null; admin: SupabaseClient | null }> {
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!url || !anon || !service) return { userId: null, admin: null };
  const admin = createClient(url, service, { auth: { persistSession: false } });

  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!jwt || jwt === anon) return { userId: null, admin };

  const userClient = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) return { userId: null, admin };
  return { userId: user.id, admin };
}

function getClientIp(req: Request): string | null {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) {
    const first = xf.split(',')[0]?.trim();
    if (first) return first;
  }
  const cf = req.headers.get('cf-connecting-ip')?.trim();
  if (cf) return cf;
  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  return null;
}

async function enforceAnonymousQuota(
  admin: SupabaseClient,
  req: Request,
  body: Record<string, unknown>,
): Promise<Response | null> {
  const ip = getClientIp(req);
  const anonSess = typeof body.anonymousSessionId === 'string' ? body.anonymousSessionId.trim() : '';
  const convId = typeof body.conversationId === 'string' ? body.conversationId.trim() : '';
  const { data, error } = await admin.rpc('claim_anonymous_search', {
    p_ip: ip ?? '',
    p_session: anonSess,
    p_conversation: convId,
  });
  if (error) {
    console.error('claim_anonymous_search:', error);
    return new Response(JSON.stringify({ error: 'Quota check failed', code: 'anon_quota_error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const row = data as { ok?: boolean; reason?: string } | null;
  if (row?.ok === true) return null;
  const reason = row?.reason ?? 'unknown';
  const messages: Record<string, string> = {
    no_ip: 'Richiesta senza indirizzo attendibile; effettua il login.',
    no_session: 'Sessione anonima mancante; aggiorna la pagina.',
    no_conversation: 'Chat non valida; aggiorna la pagina.',
    session_mismatch: 'Hai già usato Echoes da questo rete. Accedi per continuare.',
    conversation_mismatch: 'È consentita una sola chat senza account. Accedi per continuare.',
    search_limit: 'Hai già usato la ricerca gratuita. Accedi per continuare.',
  };
  return new Response(
    JSON.stringify({
      error: messages[reason] ?? 'Accesso limitato. Accedi per continuare.',
      code: `anon_${reason}`,
    }),
    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

// --- Apple Music token generation (reuse logic) ---
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  return crypto.subtle.importKey('pkcs8', binaryDer, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

function base64UrlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function textToBase64Url(text: string): string {
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

let appleMusicToken: string | null = null;
let appleMusicTokenExpiry = 0;

async function getAppleMusicToken(): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);
  if (appleMusicToken && appleMusicTokenExpiry > now + 3600) return appleMusicToken;

  const pk = Deno.env.get('APPLE_MUSIC_PRIVATE_KEY');
  const keyId = Deno.env.get('APPLE_MUSIC_KEY_ID');
  const teamId = Deno.env.get('APPLE_MUSIC_TEAM_ID');
  if (!pk || !keyId || !teamId) return null;

  const expiry = now + 15777000;
  const header = { alg: 'ES256', kid: keyId };
  const payload = { iss: teamId, iat: now, exp: expiry };
  const encodedHeader = textToBase64Url(JSON.stringify(header));
  const encodedPayload = textToBase64Url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const key = await importPrivateKey(pk);
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(signingInput));
  const token = `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
  appleMusicToken = token;
  appleMusicTokenExpiry = expiry;
  return token;
}

// --- Spotify client credentials ---
let spotifyAccessToken: string | null = null;
let spotifyTokenExpiry = 0;

async function getSpotifyToken(): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);
  if (spotifyAccessToken && spotifyTokenExpiry > now + 60) return spotifyAccessToken;

  const clientId = Deno.env.get('SPOTIFY_CLIENT_ID');
  const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');
  if (!clientId || !clientSecret) return null;

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) return null;
  const data = await res.json();
  spotifyAccessToken = data.access_token;
  spotifyTokenExpiry = now + data.expires_in;
  return data.access_token;
}

// --- Search APIs ---
interface TrackResult {
  trackId: string;
  title: string;
  artist: string;
  album: string;
  artworkUrl: string;
  provider: 'spotify' | 'apple_music';
  previewUrl?: string;
  spotifyUri?: string;
  appleMusicId?: string;
  releaseYear?: number;
}

const SEARCH_QUERY_LIMIT = 8;
const EXACT_SUGGESTION_QUERY_LIMIT = 6;
const SEARCH_RESULTS_PER_QUERY = 5;

type SpotifySearchItem = {
  id: string;
  name: string;
  uri?: string;
  preview_url?: string | null;
  artists?: Array<{ name: string }>;
  album?: {
    name?: string;
    release_date?: string;
    images?: Array<{ url?: string }>;
  };
};

type AppleMusicSearchItem = {
  id: string;
  attributes: {
    name: string;
    artistName: string;
    albumName?: string;
    releaseDate?: string;
    previews?: Array<{ url?: string }>;
    artwork?: { url?: string };
  };
};

function releaseYearFromDateString(d: string | undefined): number | undefined {
  if (!d || typeof d !== 'string') return undefined;
  const y = parseInt(d.slice(0, 4), 10);
  return y >= 1900 && y <= 2100 ? y : undefined;
}

function normalizeWhitespaceLower(s: string): string {
  return normalizeWhitespace(s).toLowerCase();
}

function normalizePrimaryArtist(artist: string): string {
  return normalizeWhitespaceLower(
    artist
      .split(/\s+(?:feat\.|ft\.|featuring|with)\s+/i)[0]
      .split(/[,&/]/)[0] || artist,
  );
}

function isVersionSuffix(inner: string): boolean {
  const s = normalizeWhitespaceLower(inner);
  return (
    /\blive\b/.test(s) ||
    /remaster/.test(s) ||
    /\bmono\b|\bstereo\b/.test(s) ||
    /\bedit\b|\bversion\b/.test(s) ||
    /\bremix\b|\bre-?mix\b|club\s+mix|extended\s+mix|radio\s+mix|dub\s+mix/.test(s) ||
    /extended|rework|vip\b|dub\b/.test(s) ||
    /\bsingle\b|\bradio\b/.test(s) ||
    /acoustic/.test(s) ||
    /re-?record/.test(s) ||
    /deluxe|bonus/.test(s) ||
    /\d{4}\s*(remaster|version)/.test(s) ||
    /clean|explicit/.test(s) ||
    /^from\s/.test(s) ||
    /soundtrack|\bost\b/.test(s) ||
    /unplugged|session|demo/.test(s) ||
    /instrumental/.test(s) ||
    /karaoke|sped up|slowed|8d\b/.test(s)
  );
}

function canonicalTitle(title: string): string {
  let s = normalizeWhitespaceLower(title);
  const dashVersion = /\s+-\s*(live|acoustic|remaster(?:ed)?|mono|stereo|radio edit|edit|version|mix|demo|session)\b/i;
  if (dashVersion.test(s)) s = s.split(dashVersion)[0]?.trim() || s;
  const paren = /\s*\(([^)]*)\)\s*$/;
  for (let i = 0; i < 12; i++) {
    const match = s.match(paren);
    if (!match) break;
    if (!isVersionSuffix(match[1])) break;
    s = s.slice(0, match.index).trim();
  }
  return normalizeWhitespaceLower(s);
}

function workKey(title: string, artist: string): string {
  return `${normalizePrimaryArtist(artist)}||${canonicalTitle(title)}`;
}

function titleLooksLikeVersion(title: string): boolean {
  const lowered = normalizeWhitespaceLower(title);
  return canonicalTitle(title) !== lowered || /\blive\b/.test(lowered);
}

async function searchSpotify(query: string, limit = 5): Promise<TrackResult[]> {
  const token = await getSpotifyToken();
  if (!token) return [];
  const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = await res.json() as { tracks?: { items?: SpotifySearchItem[] } };
  return (data.tracks?.items || []).map((t) => ({
    trackId: t.id,
    title: t.name,
    artist: (t.artists || []).map((a) => a.name).join(', '),
    album: t.album?.name || '',
    artworkUrl: t.album?.images?.[0]?.url || '',
    provider: 'spotify' as const,
    previewUrl: t.preview_url || undefined,
    spotifyUri: t.uri,
    releaseYear: releaseYearFromDateString(t.album?.release_date),
  }));
}

async function searchAppleMusic(query: string, limit = 5): Promise<TrackResult[]> {
  const token = await getAppleMusicToken();
  if (!token) return [];
  const res = await fetch(`https://api.music.apple.com/v1/catalog/us/search?types=songs&term=${encodeURIComponent(query)}&limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = await res.json() as { results?: { songs?: { data?: AppleMusicSearchItem[] } } };
  return (data.results?.songs?.data || []).map((s) => ({
    trackId: s.id,
    title: s.attributes.name,
    artist: s.attributes.artistName,
    album: s.attributes.albumName || '',
    artworkUrl: (s.attributes.artwork?.url || '').replace('{w}', '300').replace('{h}', '300'),
    provider: 'apple_music' as const,
    previewUrl: s.attributes.previews?.[0]?.url || undefined,
    appleMusicId: s.id,
    releaseYear: releaseYearFromDateString(s.attributes.releaseDate),
  }));
}

// --- Canonical axes (must match client) ---
type EnergyBand = 'low' | 'medium' | 'high';

interface StandardAxes {
  moodLabel: string;
  energy: EnergyBand;
  intimacy: number;
  catharsis: EnergyBand;
  emotionalTension: EnergyBand;
  dominantThemes: string[];
}

function normalizeStandardAxes(raw: Record<string, unknown> | null | undefined): StandardAxes {
  const e = String(raw?.energy || '').toLowerCase();
  const energy: EnergyBand = e === 'low' || e === 'high' ? e : 'medium';
  const c = String(raw?.catharsis || '').toLowerCase();
  const catharsis: EnergyBand = c === 'low' || c === 'high' ? c : 'medium';
  const t = String(raw?.emotionalTension || '').toLowerCase();
  const emotionalTension: EnergyBand = t === 'low' || t === 'high' ? t : 'medium';
  let intimacy = Number(raw?.intimacy);
  if (!Number.isFinite(intimacy)) intimacy = 3;
  intimacy = Math.min(5, Math.max(1, Math.round(intimacy)));
  const themes = Array.isArray(raw?.dominantThemes)
    ? (raw!.dominantThemes as unknown[]).filter((x): x is string => typeof x === 'string').map((s) => s.trim()).filter(Boolean).slice(0, 8)
    : [];
  let moodLabel = typeof raw?.moodLabel === 'string' ? raw.moodLabel.trim() : '';
  if (moodLabel.length > 120) moodLabel = moodLabel.slice(0, 119) + '…';
  return { moodLabel, energy, intimacy, catharsis, emotionalTension, dominantThemes: themes };
}

function clampSummary(s: string, max: number): string {
  const t = (s || '').trim();
  return t.length <= max ? t : t.slice(0, max - 1) + '…';
}

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function sentenceCase(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function stripOuterQuotes(s: string): string {
  return s.replace(/^["'«“”‘’]+|["'«“”‘’]+$/g, '');
}

function sanitizeAdjacentInterpretationText(value: string): string {
  let text = normalizeWhitespace(stripOuterQuotes(value));
  text = text.replace(/^[-\u2022\d.)\s]+/, '');
  text = text.replace(
    /^(?:forse\s+)?(?:l['’]utente|la richiesta|il prompt|this request|the user|the prompt|el usuario|la demande|o utilizador|der nutzer)\s+(?:potrebbe|could|might|may|would|seems to|podr[ií]a|pourrait|poderia|k[öo]nnte)\s+/i,
    '',
  );
  text = text.replace(
    /^(?:forse\s+)?(?:potrebbe esserci|potresti cercare|maybe you're looking for|perhaps you're looking for|quiz[aá] buscas|vous cherchez peut-[êe]tre|talvez procures)\s+/i,
    '',
  );
  text = text.replace(/^(?:qualcosa|something|algo|quelque chose|etwas)\s+di\s+/i, 'Qualcosa di ');
  text = text.replace(/[.?!]+$/g, '');
  return sentenceCase(normalizeWhitespace(text));
}

function isUsableAdjacentInterpretation(value: string, originalPrompt: string): boolean {
  if (!value) return false;
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length < 4 || words.length > 18) return false;
  if (value.length > 120) return false;
  if (originalPrompt && value.toLowerCase() === originalPrompt.trim().toLowerCase()) return false;
  if (/\b(?:utente|user|request|richiesta|prompt|message|messaggio)\b/i.test(value)) return false;
  if (/[.:;](?:\s|$)/.test(value)) return false;
  return true;
}

function fallbackAdjacentInterpretations(
  searchQueries: string[] | undefined,
  originalPrompt: string,
): string[] {
  const promptLower = originalPrompt.trim().toLowerCase();
  return (searchQueries || [])
    .map((query) => normalizeWhitespace(stripOuterQuotes(query)))
    .filter(Boolean)
    .filter((query) => query.toLowerCase() !== promptLower)
    .filter((query) => !/^[^-]+ - [^-]+$/.test(query))
    .map((query) => sentenceCase(query.replace(/[.?!]+$/g, '')))
    .filter((query) => isUsableAdjacentInterpretation(query, originalPrompt))
    .slice(0, 3);
}

function normalizeAdjacentInterpretations(
  adjacentInterpretations: string[] | undefined,
  searchQueries: string[] | undefined,
  originalPrompt: string,
): string[] {
  const cleaned = (adjacentInterpretations || [])
    .map((value) => sanitizeAdjacentInterpretationText(value))
    .filter((value) => isUsableAdjacentInterpretation(value, originalPrompt));
  const deduped = Array.from(new Set(cleaned.map((value) => value.trim())));
  if (deduped.length >= 2) return deduped.slice(0, 3);

  const fallback = fallbackAdjacentInterpretations(searchQueries, originalPrompt);
  const merged = Array.from(new Set([...deduped, ...fallback]));
  return merged.slice(0, 3);
}

/** Sotto questa soglia il brano non va in UI né in coda (allineato al client). */
const MIN_RELEVANCE_SCORE = 65;

function clampRelevance(n: unknown): number {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.min(100, Math.max(0, Math.round(x)));
}

// --- AI interpretation ---
interface AIInterpretation {
  emotionalProfile: {
    themes: string[];
    mood: string;
    energy: string;
    intimacy: string;
    catharsis: string;
    emotionalTension: string;
  };
  /** Paragrafo discorsivo sul perché della selezione (niente elenco brani). */
  narrativeReply: string;
  searchQueries: string[];
  adjacentInterpretations: string[];
  songSuggestions: Array<{ title: string; artist: string; emotionalTags: string[]; explanation: string; relevanceScore: number }>;
  conversationMemoryUpdate?: {
    threadSummary: string;
    standardAxes: Record<string, unknown>;
  };
  userTasteProfileUpdate?: {
    globalSummary?: string;
    userStandardAxes?: Record<string, unknown>;
    genreAffinityTags?: string[];
    preferredLanguages?: string[];
  };
}

type PreparedSuggestion = {
  title: string;
  artist: string;
  canonicalTitle: string;
  primaryArtist: string;
  relevanceScore: number;
  explanation: string;
  emotionalTags: string[];
};

type TrackAggregate = {
  track: TrackResult;
  score: number;
  matched: PreparedSuggestion | null;
  versions: TrackResult[];
};

function prepareSuggestion(suggestion: AIInterpretation['songSuggestions'][number]): PreparedSuggestion {
  return {
    title: suggestion.title,
    artist: suggestion.artist,
    canonicalTitle: canonicalTitle(suggestion.title),
    primaryArtist: normalizePrimaryArtist(suggestion.artist),
    relevanceScore: clampRelevance(suggestion.relevanceScore),
    explanation: suggestion.explanation,
    emotionalTags: suggestion.emotionalTags,
  };
}

function scoreTrackAgainstSuggestion(track: TrackResult, suggestion: PreparedSuggestion): number {
  const trackTitle = canonicalTitle(track.title);
  const trackArtist = normalizePrimaryArtist(track.artist);
  const exactTitle = trackTitle === suggestion.canonicalTitle;
  const exactArtist = trackArtist === suggestion.primaryArtist;
  const titleContains =
    trackTitle.includes(suggestion.canonicalTitle) || suggestion.canonicalTitle.includes(trackTitle);
  const versionPenalty = titleLooksLikeVersion(track.title) ? 4 : 0;

  if (exactTitle && exactArtist) return suggestion.relevanceScore - versionPenalty;
  if (exactTitle) return suggestion.relevanceScore - 18 - versionPenalty;
  if (titleContains && exactArtist) return suggestion.relevanceScore - 10 - versionPenalty;
  if (titleContains) return suggestion.relevanceScore - 26 - versionPenalty;
  return 0;
}

function diversifySongsByArtist<T extends { artist: string }>(songs: T[], limit: number): T[] {
  const selected: T[] = [];
  const seenArtists = new Set<string>();

  for (const song of songs) {
    if (selected.length >= limit) break;
    const artist = normalizePrimaryArtist(song.artist);
    if (seenArtists.has(artist)) continue;
    selected.push(song);
    seenArtists.add(artist);
  }

  for (const song of songs) {
    if (selected.length >= limit) break;
    if (selected.includes(song)) continue;
    selected.push(song);
  }

  return selected.slice(0, limit);
}

function variantSortValue(title: string): number {
  const lowered = normalizeWhitespaceLower(title);
  if (!titleLooksLikeVersion(title)) return 0;
  if (/\blive\b/.test(lowered)) return 4;
  if (/remaster/.test(lowered)) return 2;
  if (/acoustic|demo|session|instrumental/.test(lowered)) return 3;
  return 1;
}

const standardAxesSchema = {
  type: 'object',
  properties: {
    moodLabel: { type: 'string', description: 'Short mood label, max ~120 chars' },
    energy: { type: 'string', enum: ['low', 'medium', 'high'] },
    intimacy: { type: 'number', description: '1-5' },
    catharsis: { type: 'string', enum: ['low', 'medium', 'high'] },
    emotionalTension: { type: 'string', enum: ['low', 'medium', 'high'] },
    dominantThemes: { type: 'array', items: { type: 'string' }, maxItems: 8 },
  },
  required: ['moodLabel', 'energy', 'intimacy', 'catharsis', 'emotionalTension', 'dominantThemes'],
};

async function interpretDiscovery(params: {
  userContent: string;
  descriptionLanguage?: string;
  mode: 'search' | 'lucky';
  image?: { base64: string; mimeType: string };
  route: AiInferenceRoute;
}): Promise<{
  interpretation: AIInterpretation;
  usage: GatewayUsage;
  gatewayRequestId: string | null;
}> {
  const languageInstruction = params.descriptionLanguage && params.descriptionLanguage !== 'auto'
    ? `IMPORTANT: The user has set their preferred language to "${params.descriptionLanguage}". ALL song explanations/descriptions MUST be written in ${params.descriptionLanguage}, regardless of the language of the user's prompt or the songs themselves. The emotional profile text (mood, energy, etc.) should also be in ${params.descriptionLanguage}.`
    : `Write explanations and emotional profile text in the same language as the user's prompt.`;

  const luckyBlock = params.mode === 'lucky'
    ? `
## Lucky / surprise mode:
The user did not type a prompt. Use ONLY the long-term taste profile and conversation memory (if any) in the message to pick:
- One excellent "hero" starting track that fits them.
- Several more tracks that feel like discovery — slightly less obvious, same emotional/genre neighborhood.
Still output full searchQueries and songSuggestions (6-8 real songs).
**narrativeReply (lucky):** write like a short personal note about taste and discovery — warmth, curiosity, tension/release. Do **not** list song titles (the app shows them as links). Do not name every track.`
    : '';

  const memoryBlock = `
## Memory (structured, not full chat):
The user message may include JSON blocks "conversationMemory" and "userTasteProfile". Use them ONLY for continuity and taste defaults.
The **current user message** always wins if it conflicts with memory.
After interpreting, you MUST output:
- **conversationMemoryUpdate**: a 2-4 sentence threadSummary merging prior summary with this turn; **standardAxes** using ONLY enums: energy/catharsis/emotionalTension in low|medium|high, intimacy integer 1-5, dominantThemes array (max 8 short tags), moodLabel short.
- **userTasteProfileUpdate**: optional incremental globalSummary (brief), userStandardAxes (same schema), genreAffinityTags (max 12), preferredLanguages (max 6). Only include fields that should change.`;

  const visionAddendum = params.image
    ? `

## Image attached:
The user included a **photo**. You can see it in the same user turn. Use visual cues: palette, light, subject, setting, era/fashion if visible, film-still or poster vibes, texture (grain, neon, nature). Map what you see to **mood, themes, and concrete song picks** (soundtracks, genres, artists that fit that world). If text prompt is empty, infer everything from the image plus memory.`
    : '';

  const systemPrompt = `You are Echoes, an advanced emotionally and culturally intelligent music discovery engine with deep knowledge of song lyrics, genres, languages, and musical concepts.

## Your capabilities:
- **Lyrics awareness**: You know the lyrical content of thousands of songs. When a user asks about songs that "talk about" something, or mentions themes/topics, match based on what the lyrics actually say — not just the song title or mood.
- **Genre & subgenre expertise**: You understand genres (rock, jazz, hip-hop, lo-fi, synthwave, bossa nova, etc.), subgenres, and micro-genres. Match precisely.
- **Language awareness**: If the user writes in a specific language or mentions a language/country (e.g. "musica italiana", "chansons françaises", "J-pop"), prioritize songs IN that language. If the user writes in Italian, prefer Italian songs unless they specify otherwise.
- **Era & period**: Understand decades and musical eras (80s synth-pop, 90s grunge, 2000s indie, etc.).
- **Complex concepts**: Handle metaphors, abstract ideas, cultural references, literary allusions, and synesthetic descriptions ("music that tastes like rain", "songs that feel like velvet").
- **Instrumentation & production**: Understand lo-fi, acoustic, orchestral, electronic, analog, etc.
- **Single-word and very short prompts**: If the user writes only one word (or a tiny fragment), do **not** treat it as "find songs whose title contains this substring" by default. First **interpret** what the word likely means in context: mood, emotion, metaphor, genre tag, artist name, or a **specific song title** the user is naming outright.
  - If it reads like an **emotion or abstract state** (e.g. nostalgia, rage, peace, longing, euphoria, grief, "malinconia", "euforia"), expand into **themes, lyrical angles, and sonic mood**. Pick songs that match the **meaning and felt experience**, not merely titles that spell the same word.
  - If it is plausibly the **exact or well-known title** of a real song (or unmistakable shorthand for it), then prioritize **that** track and close variants — the user is asking for that song.
  - When ambiguous, lean toward **semantic/emotional fit** and use **searchQueries** that describe mood/theme/artist direction, not only the raw token.

## Language for descriptions:
${languageInstruction}
${luckyBlock}
${memoryBlock}

## Instructions:
Given the user's message${params.image ? ' (and attached image)' : ''}:
1. Detect the language of the active prompt (if any). If it's not English, respond with song suggestions primarily in that language unless the prompt explicitly asks for another language.
2. Create an emotional profile analyzing themes, mood, energy, intimacy, catharsis, and emotional tension (rich text for UI).
3. Generate 5-7 highly specific search queries optimized for Spotify/Apple Music search (use "artist name - song title" format when possible, or genre/mood keywords). At least 2 queries should intentionally go a bit deeper than the most obvious answer: hidden gems, deeper cuts, overlooked songs, niche adjacent scenes.
4. Suggest 6-8 specific REAL songs with correct artists. Prioritize songs whose LYRICS match the user's intent. **Avoid suggesting multiple storefront variants of the same work** (e.g. same song as studio + remaster + remix + live) unless the user clearly wants versions; prefer one canonical cut per song. Diversify across artists whenever possible; avoid repeating the same primary artist unless the prompt strongly calls for it. Include at least 2 less-obvious, high-quality picks when the request allows it. For each suggestion: emotional tags (3 words), a **distinct** poetic explanation tied to that song's lyrics or identity (never copy the same sentence across songs), and **relevanceScore** (0-100). **Score honestly**: weak or tangential fits must be **below 65**. Only strong, clearly justified picks should be **65 or above**. Do not inflate scores to fill the list.
5. Write **narrativeReply**: 2-5 sentences, same language as the user. One flowing paragraph: why this **cluster** fits the request emotionally (themes, arc, intent). Sound human and specific. **Do not** list every song, **do not** use «guillemets» or track-by-track blurbs — per-track reasoning lives only in each song's **explanation** field. You may name at most one anchor track if it feels natural; otherwise no titles. No bullet lists.
6. Generate 2-3 adjacent interpretations — creative alternative readings of the prompt (or of the lucky pick).
   They must be SHORT USER INPUTS the person could actually type next.
   Good: "Più viscerale e meno levigato", "Rock sporco con senso di vittoria", "Cantautorato italiano meno mainstream".
   Bad: "L'utente potrebbe desiderare qualcosa di più viscerale", "La richiesta potrebbe virare verso...", "Potrebbe esserci il desiderio di...".
   Never describe the user, the request, or your reasoning. No explanatory full sentences.
7. Fill conversationMemoryUpdate and userTasteProfileUpdate as described.

CRITICAL: Only suggest songs that actually exist. Use correct artist names and song titles. When the user asks about lyrical content, your explanation MUST reference actual lyrics or themes from the song.${visionAddendum}`;

  const userMessage = params.image
    ? {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `${params.userContent}\n\n[Immagine allegata: interpreta atmosfera, palette, soggetto, contesto e colonna sonora implicita.]`,
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:${params.image.mimeType};base64,${params.image.base64}`,
          },
        },
      ],
    }
    : { role: 'user', content: params.userContent };

  const chatBody = {
    messages: [
      { role: 'system', content: systemPrompt },
      userMessage,
    ],
    tools: [{
      type: 'function',
      function: {
        name: 'interpret_emotion',
        description: 'Interpret the emotional content of a music discovery prompt',
        parameters: {
          type: 'object',
          properties: {
            emotionalProfile: {
              type: 'object',
              properties: {
                themes: { type: 'array', items: { type: 'string' } },
                mood: { type: 'string' },
                energy: { type: 'string' },
                intimacy: { type: 'string' },
                catharsis: { type: 'string' },
                emotionalTension: { type: 'string' },
              },
              required: ['themes', 'mood', 'energy', 'intimacy', 'catharsis', 'emotionalTension'],
            },
            searchQueries: { type: 'array', items: { type: 'string' }, description: 'Search queries to find matching songs on Spotify/Apple Music' },
            adjacentInterpretations: {
              type: 'array',
              items: { type: 'string' },
              description:
                '2-3 short alternative prompts the user could type next. They must read like direct search inputs, not commentary about the user or the request.',
            },
            narrativeReply: {
              type: 'string',
              description:
                '2-5 sentences: organic paragraph on why this selection fits; same language as user; no «quotes», no listing all songs; per-song blurbs only in songSuggestions.explanation',
            },
            songSuggestions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  artist: { type: 'string' },
                  emotionalTags: { type: 'array', items: { type: 'string' } },
                  explanation: { type: 'string' },
                  relevanceScore: {
                    type: 'number',
                    description:
                      'How well this track fits the user request (0-100). Must be honest: below 65 if the fit is weak or forced; 65+ only for clearly strong matches. The app hides sub-65 picks.',
                  },
                },
                required: ['title', 'artist', 'emotionalTags', 'explanation', 'relevanceScore'],
              },
            },
            conversationMemoryUpdate: {
              type: 'object',
              properties: {
                threadSummary: { type: 'string' },
                standardAxes: standardAxesSchema,
              },
              required: ['threadSummary', 'standardAxes'],
            },
            userTasteProfileUpdate: {
              type: 'object',
              properties: {
                globalSummary: { type: 'string' },
                userStandardAxes: standardAxesSchema,
                genreAffinityTags: { type: 'array', items: { type: 'string' }, maxItems: 12 },
                preferredLanguages: { type: 'array', items: { type: 'string' }, maxItems: 6 },
              },
            },
          },
          required: [
            'emotionalProfile',
            'narrativeReply',
            'searchQueries',
            'adjacentInterpretations',
            'songSuggestions',
            'conversationMemoryUpdate',
          ],
        },
      },
    }],
    tool_choice: { type: 'function', function: { name: 'interpret_emotion' } },
  };

  const { data, usage, gatewayRequestId } = await runInferenceCompletion(params.route, chatBody);
  const d = data as { choices?: Array<{ message?: { tool_calls?: Array<{ function?: { arguments?: string } }> } }> };
  const toolCall = d.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) throw new Error('AI did not return structured output');

  return {
    interpretation: JSON.parse(toolCall.function.arguments) as AIInterpretation,
    usage,
    gatewayRequestId,
  };
}

async function interpretMemoryCompact(params: {
  descriptionLanguage?: string;
  conversationMemory: Record<string, unknown> | null;
  userTasteProfile: Record<string, unknown> | null;
  lastUserPrompt?: string;
  route: AiInferenceRoute;
}): Promise<{
  conversationMemoryUpdate: { threadSummary: string; standardAxes: StandardAxes };
  userTasteProfileUpdate?: AIInterpretation['userTasteProfileUpdate'];
  usage: GatewayUsage;
  gatewayRequestId: string | null;
}> {
  const userContent = [
    'Compress and realign conversation memory only. Do not suggest songs.',
    params.lastUserPrompt ? `Last user prompt snippet: ${params.lastUserPrompt.slice(0, 500)}` : '',
    `conversationMemory: ${JSON.stringify(params.conversationMemory || {})}`,
    `userTasteProfile: ${JSON.stringify(params.userTasteProfile || {})}`,
  ].filter(Boolean).join('\n');

  const chatBody = {
    messages: [
      {
        role: 'system',
        content: 'Output only structured memory updates. threadSummary 2-4 sentences. standardAxes must use enums low|medium|high and intimacy 1-5.',
      },
      { role: 'user', content: userContent },
    ],
    tools: [{
      type: 'function',
      function: {
        name: 'compact_memory',
        parameters: {
          type: 'object',
          properties: {
            conversationMemoryUpdate: {
              type: 'object',
              properties: {
                threadSummary: { type: 'string' },
                standardAxes: standardAxesSchema,
              },
              required: ['threadSummary', 'standardAxes'],
            },
            userTasteProfileUpdate: {
              type: 'object',
              properties: {
                globalSummary: { type: 'string' },
                userStandardAxes: standardAxesSchema,
                genreAffinityTags: { type: 'array', items: { type: 'string' } },
                preferredLanguages: { type: 'array', items: { type: 'string' } },
              },
            },
          },
          required: ['conversationMemoryUpdate'],
        },
      },
    }],
    tool_choice: { type: 'function', function: { name: 'compact_memory' } },
  };

  const { data, usage, gatewayRequestId } = await runInferenceCompletion(params.route, chatBody);
  const d = data as { choices?: Array<{ message?: { tool_calls?: Array<{ function?: { arguments?: string } }> } }> };
  const toolCall = d.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) throw new Error('AI did not return structured output');
  const parsed = JSON.parse(toolCall.function.arguments);
  const axes = normalizeStandardAxes(parsed.conversationMemoryUpdate?.standardAxes);
  return {
    conversationMemoryUpdate: {
      threadSummary: clampSummary(parsed.conversationMemoryUpdate?.threadSummary || '', 560),
      standardAxes: axes,
    },
    userTasteProfileUpdate: parsed.userTasteProfileUpdate,
    usage,
    gatewayRequestId,
  };
}

function buildUserContent(
  prompt: string,
  conversationMemory: Record<string, unknown> | null | undefined,
  userTasteProfile: Record<string, unknown> | null | undefined,
): string {
  const parts: string[] = [];
  if (conversationMemory && Object.keys(conversationMemory).length > 0) {
    parts.push(`conversationMemory (JSON): ${JSON.stringify(conversationMemory)}`);
  }
  if (userTasteProfile && Object.keys(userTasteProfile).length > 0) {
    parts.push(`userTasteProfile (JSON): ${JSON.stringify(userTasteProfile)}`);
  }
  parts.push(
    `Current user prompt: ${prompt || '(none — user attached an image only, or lucky mode; infer from image and/or memory as instructed)'}`,
  );
  return parts.join('\n\n');
}

function sanitizeInterpretation(i: AIInterpretation, originalPrompt = ''): AIInterpretation {
  const cm = i.conversationMemoryUpdate;
  if (cm?.standardAxes) {
    cm.standardAxes = normalizeStandardAxes(cm.standardAxes as Record<string, unknown>) as unknown as Record<string, unknown>;
  }
  if (cm?.threadSummary) cm.threadSummary = clampSummary(cm.threadSummary, 560);
  const ut = i.userTasteProfileUpdate;
  if (ut?.userStandardAxes) {
    ut.userStandardAxes = normalizeStandardAxes(ut.userStandardAxes as Record<string, unknown>) as unknown as Record<string, unknown>;
  }
  if (ut?.globalSummary) ut.globalSummary = clampSummary(ut.globalSummary, 560);
  if (typeof i.narrativeReply === 'string') {
    i.narrativeReply = clampSummary(i.narrativeReply, 2800);
  }
  i.adjacentInterpretations = normalizeAdjacentInterpretations(
    i.adjacentInterpretations,
    i.searchQueries,
    originalPrompt,
  );
  return i;
}

// --- Main handler ---
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let ctxUserId: string | null = null;
  let ctxAdmin: SupabaseClient | null = null;
  try {
    const { userId, admin } = await resolveUserContext(req);
    ctxUserId = userId;
    ctxAdmin = admin;
    const body = await req.json().catch(() => ({}));

    if (!userId) {
      if (!admin) {
        return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const quotaResp = await enforceAnonymousQuota(admin, req, body as Record<string, unknown>);
      if (quotaResp) return quotaResp;
    }

    const {
      prompt: rawPrompt,
      imageBase64: rawImageB64,
      imageMimeType: rawImageMime,
      descriptionLanguage,
      mode = 'search',
      conversationMemory,
      userTasteProfile,
      lastUserPrompt,
    } = body as {
      prompt?: string;
      imageBase64?: string;
      imageMimeType?: string;
      descriptionLanguage?: string;
      mode?: string;
      conversationMemory?: Record<string, unknown> | null;
      userTasteProfile?: Record<string, unknown> | null;
      lastUserPrompt?: string;
    };

    const imageB64 = typeof rawImageB64 === 'string' ? rawImageB64.replace(/\s/g, '') : '';
    const mimeIn = typeof rawImageMime === 'string' ? rawImageMime.trim().toLowerCase() : '';
    const allowedMime = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
    const imageMime = allowedMime.has(mimeIn) ? (mimeIn === 'image/jpg' ? 'image/jpeg' : mimeIn) : 'image/jpeg';
    const hasImage = imageB64.length > 120;
    if (hasImage && imageB64.length > 6_000_000) {
      return new Response(JSON.stringify({ error: 'image too large' }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (mode === 'memory_compact') {
      if (userId && admin) {
        const { data: tokMc } = await admin.from('user_tokens').select('balance').eq('user_id', userId).maybeSingle();
        if (!tokMc || tokMc.balance < 1) {
          return new Response(
            JSON.stringify({ error: 'Insufficient tokens', code: 'insufficient_tokens' }),
            {
              status: 402,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          );
        }
      }
      const routeMc = await loadAiInferenceRoute(admin, userId, false);
      const compact = await interpretMemoryCompact({
        descriptionLanguage,
        conversationMemory: conversationMemory ?? null,
        userTasteProfile: userTasteProfile ?? null,
        lastUserPrompt,
        route: routeMc,
      });
      await insertAiUsage(admin, {
        user_id: userId,
        operation: 'memory_compact',
        search_mode: 'memory_compact',
        usage: compact.usage,
        gateway_request_id: compact.gatewayRequestId,
        ...(routeMc.kind === 'byo'
          ? { provider: 'byo_openai', model: routeMc.model }
          : {}),
      });
      if (userId && admin) {
        const { data: spentMc, error: spendMcErr } = await admin.rpc('spend_token', {
          p_user_id: userId,
          p_amount: 1,
        });
        if (spendMcErr || spentMc !== true) {
          console.error('spend_token memory_compact:', spendMcErr, spentMc);
          return new Response(
            JSON.stringify({ error: 'Insufficient tokens', code: 'insufficient_tokens' }),
            {
              status: 402,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          );
        }
      }
      return new Response(JSON.stringify({
        conversationMemoryUpdate: {
          threadSummary: compact.conversationMemoryUpdate.threadSummary,
          standardAxes: compact.conversationMemoryUpdate.standardAxes,
        },
        userTasteProfileUpdate: compact.userTasteProfileUpdate ?? undefined,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = typeof rawPrompt === 'string' ? rawPrompt.trim() : '';
    if (mode !== 'lucky' && prompt.length === 0 && !hasImage) {
      return new Response(JSON.stringify({ error: 'prompt or image is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (mode === 'lucky' && hasImage) {
      return new Response(JSON.stringify({ error: 'image is not supported in lucky mode' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userContent = buildUserContent(
      mode === 'lucky' ? '' : prompt,
      conversationMemory ?? null,
      userTasteProfile ?? null,
    );

    if (userId && admin) {
      const { data: tok } = await admin.from('user_tokens').select('balance').eq('user_id', userId).maybeSingle();
      if (!tok || tok.balance < 1) {
        return new Response(
          JSON.stringify({ error: 'Insufficient tokens', code: 'insufficient_tokens' }),
          {
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }
    }

    const routeDisc = await loadAiInferenceRoute(admin, userId, hasImage);
    const discovery = await interpretDiscovery({
      userContent,
      descriptionLanguage,
      mode: mode === 'lucky' ? 'lucky' : 'search',
      ...(hasImage ? { image: { base64: imageB64, mimeType: imageMime } } : {}),
      route: routeDisc,
    });
    await insertAiUsage(admin, {
      user_id: userId,
      operation: 'interpret_discovery',
      search_mode: mode === 'lucky' ? 'lucky' : 'search',
      usage: discovery.usage,
      gateway_request_id: discovery.gatewayRequestId,
      ...(routeDisc.kind === 'byo'
        ? { provider: 'byo_openai', model: routeDisc.model }
        : {}),
    });
    const interpretation = sanitizeInterpretation(discovery.interpretation, prompt);

    const preparedSuggestions = interpretation.songSuggestions.map(prepareSuggestion);

    // Step 2: search exact suggestions first, then the broader semantic queries.
    const allQueries = [
      ...preparedSuggestions.slice(0, EXACT_SUGGESTION_QUERY_LIMIT).map((s) => `${s.artist} - ${s.title}`),
      ...interpretation.searchQueries,
    ];

    // Deduplicate queries while preserving priority.
    const uniqueQueries = [...new Set(allQueries.map((q) => normalizeWhitespace(q)).filter(Boolean))]
      .slice(0, SEARCH_QUERY_LIMIT);

    // Search in parallel
    const searchPromises = uniqueQueries.flatMap(q => [
      searchSpotify(q, SEARCH_RESULTS_PER_QUERY),
      searchAppleMusic(q, SEARCH_RESULTS_PER_QUERY),
    ]);
    const searchResults = await Promise.all(searchPromises);
    const allTracks = searchResults.flat();

    // Deduplicate by canonical work, while merging provider-specific ids and keeping the strongest hit.
    const mergedTracks = new Map<string, TrackAggregate>();
    for (const track of allTracks) {
      let bestSuggestion: PreparedSuggestion | null = null;
      let bestScore = 0;
      for (const suggestion of preparedSuggestions) {
        const score = scoreTrackAgainstSuggestion(track, suggestion);
        if (score > bestScore) {
          bestScore = score;
          bestSuggestion = suggestion;
        }
      }
      const entryScore = clampRelevance(bestSuggestion ? bestScore : 42 - (titleLooksLikeVersion(track.title) ? 4 : 0));
      const key = workKey(track.title, track.artist);
      const existing = mergedTracks.get(key);
      if (!existing) {
        mergedTracks.set(key, {
          track,
          score: entryScore,
          matched: bestSuggestion,
          versions: [track],
        });
        continue;
      }

      const versions = [...existing.versions];
      if (!versions.some((version) => version.trackId === track.trackId && version.provider === track.provider)) {
        versions.push(track);
      }

      mergedTracks.set(key, {
        track: {
          ...existing.track,
          ...(entryScore > existing.score
            ? {
                title: track.title,
                artist: track.artist,
                album: track.album,
                provider: track.provider,
                trackId: track.trackId,
                artworkUrl: track.artworkUrl || existing.track.artworkUrl,
                releaseYear: track.releaseYear ?? existing.track.releaseYear,
              }
            : {}),
          previewUrl: existing.track.previewUrl || track.previewUrl,
          spotifyUri: existing.track.spotifyUri || track.spotifyUri,
          appleMusicId: existing.track.appleMusicId || track.appleMusicId,
          artworkUrl: existing.track.artworkUrl || track.artworkUrl,
          releaseYear: existing.track.releaseYear ?? track.releaseYear,
        },
        score: Math.max(existing.score, entryScore),
        matched: existing.matched ?? bestSuggestion,
        versions,
      });
    }
    const uniqueTracks = [...mergedTracks.values()];

    const preferItFallback =
      typeof descriptionLanguage === 'string' && descriptionLanguage.trim().toLowerCase().startsWith('it');
    const explPoolIt = [
      'Si integra nel percorso emotivo della ricerca, tra timbro e respiro degli altri brani.',
      'Apre una sfumatura diversa ma coerente: stesso clima, angolazione nuova.',
      'Sostiene il filo dell’ascolto senza ripetere le stesse motivazioni delle altre scelte.',
      'Porta una tensione o un sollievo che dialoga col resto della selezione.',
    ];
    const explPoolEn = [
      'Fits the emotional arc of this set through tone and pacing, alongside the other picks.',
      'Adds a complementary angle — same neighborhood, a different window in.',
      'Carries the thread without recycling the same justification as sibling tracks.',
      'Brings a distinct energy that still belongs in this cluster.',
    ];
    const explPool = preferItFallback ? explPoolIt : explPoolEn;

    // Enrich tracks with AI suggestions' emotional data (no fake-high scores for unrelated search hits)
    const enrichedSongs = uniqueTracks.map(({ track, score, matched, versions }, i) => {
      const alternateVersions = versions
        .filter((version) => !(version.trackId === track.trackId && version.provider === track.provider))
        .sort((a, b) => {
          const kind = variantSortValue(a.title) - variantSortValue(b.title);
          if (kind !== 0) return kind;
          return a.title.localeCompare(b.title);
        })
        .map((version) => ({
          id: `${version.provider}-${version.trackId}`,
          title: version.title,
          artist: version.artist,
          album: version.album,
          ...(version.releaseYear != null ? { releaseYear: version.releaseYear } : {}),
          provider: version.provider,
          ...(version.spotifyUri ? { spotifyUri: version.spotifyUri } : {}),
          ...(version.appleMusicId ? { appleMusicId: version.appleMusicId } : {}),
          ...(version.previewUrl ? { previewUrl: version.previewUrl } : {}),
        }));

      return {
        id: `${track.provider}-${track.trackId}`,
        title: track.title,
        artist: track.artist,
        album: track.album,
        ...(track.releaseYear != null ? { releaseYear: track.releaseYear } : {}),
        artwork: track.artworkUrl,
        emotionalTags: matched?.emotionalTags || interpretation.emotionalProfile.themes.slice(0, 3),
        explanation: matched?.explanation || explPool[i % explPool.length],
        relevanceScore: score,
        provider: track.provider,
        spotifyUri: track.spotifyUri,
        appleMusicId: track.appleMusicId,
        previewUrl: track.previewUrl,
        ...(alternateVersions.length ? { alternateVersions } : {}),
      };
    });

    const passed = enrichedSongs.filter((s) => s.relevanceScore >= MIN_RELEVANCE_SCORE);
    passed.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const diversified = diversifySongsByArtist(passed, 8);

    const cm = interpretation.conversationMemoryUpdate;
    const ut = interpretation.userTasteProfileUpdate;

    const result = {
      emotionalProfile: interpretation.emotionalProfile,
      narrativeReply: interpretation.narrativeReply || '',
      songs: diversified,
      adjacentInterpretations: interpretation.adjacentInterpretations,
      conversationMemoryUpdate: cm ? {
        threadSummary: cm.threadSummary,
        standardAxes: normalizeStandardAxes(cm.standardAxes as Record<string, unknown>),
      } : undefined,
      userTasteProfileUpdate: ut,
    };

    if (userId && admin) {
      const { data: spent, error: spendErr } = await admin.rpc('spend_token', { p_user_id: userId, p_amount: 1 });
      if (spendErr || spent !== true) {
        console.error('spend_token search:', spendErr, spent, userId);
        return new Response(
          JSON.stringify({ error: 'Insufficient tokens', code: 'insufficient_tokens' }),
          {
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    if (err instanceof ByoOpenAiError && ctxUserId && ctxAdmin) {
      await ctxAdmin.from('user_settings').update({
        byo_key_status: mapByoCodeToDbStatus(err.code),
        updated_at: new Date().toISOString(),
      }).eq('user_id', ctxUserId);
      return new Response(JSON.stringify({
        error: userMessageForByoCode(err.code),
        code: `byo_${err.code}`,
        byo_fallback_suggested: true,
      }), {
        status: httpStatusForByo(err),
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.error('music-search error:', err instanceof Error ? err.message : err);
    const message = err instanceof Error ? err.message : String(err);
    const status = message?.includes('Rate limited') ? 429
      : message?.includes('credits') ? 402 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
