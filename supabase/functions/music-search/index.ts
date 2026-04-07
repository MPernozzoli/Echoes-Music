const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

function releaseYearFromDateString(d: string | undefined): number | undefined {
  if (!d || typeof d !== 'string') return undefined;
  const y = parseInt(d.slice(0, 4), 10);
  return y >= 1900 && y <= 2100 ? y : undefined;
}

async function searchSpotify(query: string, limit = 5): Promise<TrackResult[]> {
  const token = await getSpotifyToken();
  if (!token) return [];
  const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.tracks?.items || []).map((t: any) => ({
    trackId: t.id,
    title: t.name,
    artist: t.artists.map((a: any) => a.name).join(', '),
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
  const data = await res.json();
  return (data.results?.songs?.data || []).map((s: any) => ({
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
}): Promise<AIInterpretation> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) throw new Error('LOVABLE_API_KEY not configured');

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

  const systemPrompt = `You are Echoes, an advanced emotionally and culturally intelligent music discovery engine with deep knowledge of song lyrics, genres, languages, and musical concepts.

## Your capabilities:
- **Lyrics awareness**: You know the lyrical content of thousands of songs. When a user asks about songs that "talk about" something, or mentions themes/topics, match based on what the lyrics actually say — not just the song title or mood.
- **Genre & subgenre expertise**: You understand genres (rock, jazz, hip-hop, lo-fi, synthwave, bossa nova, etc.), subgenres, and micro-genres. Match precisely.
- **Language awareness**: If the user writes in a specific language or mentions a language/country (e.g. "musica italiana", "chansons françaises", "J-pop"), prioritize songs IN that language. If the user writes in Italian, prefer Italian songs unless they specify otherwise.
- **Era & period**: Understand decades and musical eras (80s synth-pop, 90s grunge, 2000s indie, etc.).
- **Complex concepts**: Handle metaphors, abstract ideas, cultural references, literary allusions, and synesthetic descriptions ("music that tastes like rain", "songs that feel like velvet").
- **Instrumentation & production**: Understand lo-fi, acoustic, orchestral, electronic, analog, etc.

## Language for descriptions:
${languageInstruction}
${luckyBlock}
${memoryBlock}

## Instructions:
Given the user's message:
1. Detect the language of the active prompt (if any). If it's not English, respond with song suggestions primarily in that language unless the prompt explicitly asks for another language.
2. Create an emotional profile analyzing themes, mood, energy, intimacy, catharsis, and emotional tension (rich text for UI).
3. Generate 4-5 highly specific search queries optimized for Spotify/Apple Music search (use "artist name - song title" format when possible, or genre/mood keywords).
4. Suggest 6-8 specific REAL songs with correct artists. Prioritize songs whose LYRICS match the user's intent. **Avoid suggesting multiple storefront variants of the same work** (e.g. same song as studio + remaster + remix + live) unless the user clearly wants versions; prefer one canonical cut per song. For each suggestion: emotional tags (3 words), a **distinct** poetic explanation tied to that song's lyrics or identity (never copy the same sentence across songs), and relevance score (0-100).
5. Write **narrativeReply**: 2-5 sentences, same language as the user. One flowing paragraph: why this **cluster** fits the request emotionally (themes, arc, intent). Sound human and specific. **Do not** list every song, **do not** use «guillemets» or track-by-track blurbs — per-track reasoning lives only in each song's **explanation** field. You may name at most one anchor track if it feels natural; otherwise no titles. No bullet lists.
6. Generate 2-3 adjacent interpretations — creative alternative readings of the prompt (or of the lucky pick).
7. Fill conversationMemoryUpdate and userTasteProfileUpdate as described.

CRITICAL: Only suggest songs that actually exist. Use correct artist names and song titles. When the user asks about lyrical content, your explanation MUST reference actual lyrics or themes from the song.`;


  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: params.userContent },
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
              adjacentInterpretations: { type: 'array', items: { type: 'string' } },
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
                    relevanceScore: { type: 'number' },
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
    }),
  });

  if (!res.ok) {
    const status = res.status;
    const text = await res.text();
    console.error('AI gateway error:', status, text);
    if (status === 429) throw new Error('Rate limited - please try again shortly');
    if (status === 402) throw new Error('AI credits exhausted');
    throw new Error('AI interpretation failed');
  }

  const data = await res.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error('AI did not return structured output');

  return JSON.parse(toolCall.function.arguments);
}

async function interpretMemoryCompact(params: {
  descriptionLanguage?: string;
  conversationMemory: Record<string, unknown> | null;
  userTasteProfile: Record<string, unknown> | null;
  lastUserPrompt?: string;
}): Promise<{ conversationMemoryUpdate: { threadSummary: string; standardAxes: StandardAxes }; userTasteProfileUpdate?: AIInterpretation['userTasteProfileUpdate'] }> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) throw new Error('LOVABLE_API_KEY not configured');

  const userContent = [
    'Compress and realign conversation memory only. Do not suggest songs.',
    params.lastUserPrompt ? `Last user prompt snippet: ${params.lastUserPrompt.slice(0, 500)}` : '',
    `conversationMemory: ${JSON.stringify(params.conversationMemory || {})}`,
    `userTasteProfile: ${JSON.stringify(params.userTasteProfile || {})}`,
  ].filter(Boolean).join('\n');

  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
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
    }),
  });

  if (!res.ok) {
    const status = res.status;
    const text = await res.text();
    console.error('AI gateway error (compact):', status, text);
    if (status === 429) throw new Error('Rate limited - please try again shortly');
    if (status === 402) throw new Error('AI credits exhausted');
    throw new Error('AI memory compact failed');
  }

  const data = await res.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error('AI did not return structured output');
  const parsed = JSON.parse(toolCall.function.arguments);
  const axes = normalizeStandardAxes(parsed.conversationMemoryUpdate?.standardAxes);
  return {
    conversationMemoryUpdate: {
      threadSummary: clampSummary(parsed.conversationMemoryUpdate?.threadSummary || '', 560),
      standardAxes: axes,
    },
    userTasteProfileUpdate: parsed.userTasteProfileUpdate,
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
  parts.push(`Current user prompt: ${prompt || '(none — follow mode instructions)'}`);
  return parts.join('\n\n');
}

function sanitizeInterpretation(i: AIInterpretation): AIInterpretation {
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
  return i;
}

// --- Main handler ---
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const {
      prompt: rawPrompt,
      descriptionLanguage,
      mode = 'search',
      conversationMemory,
      userTasteProfile,
      lastUserPrompt,
    } = body as {
      prompt?: string;
      descriptionLanguage?: string;
      mode?: string;
      conversationMemory?: Record<string, unknown> | null;
      userTasteProfile?: Record<string, unknown> | null;
      lastUserPrompt?: string;
    };

    if (mode === 'memory_compact') {
      const compact = await interpretMemoryCompact({
        descriptionLanguage,
        conversationMemory: conversationMemory ?? null,
        userTasteProfile: userTasteProfile ?? null,
        lastUserPrompt,
      });
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
    if (mode !== 'lucky' && prompt.length === 0) {
      return new Response(JSON.stringify({ error: 'prompt is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userContent = buildUserContent(
      mode === 'lucky' ? '' : prompt,
      conversationMemory ?? null,
      userTasteProfile ?? null,
    );

    const interpretation = sanitizeInterpretation(
      await interpretDiscovery({
        userContent,
        descriptionLanguage,
        mode: mode === 'lucky' ? 'lucky' : 'search',
      }),
    );

    // Step 2: Search both platforms using AI-generated queries + direct song lookups
    const allQueries = [
      ...interpretation.searchQueries,
      ...interpretation.songSuggestions.slice(0, 3).map(s => `${s.title} ${s.artist}`),
    ];

    // Deduplicate queries
    const uniqueQueries = [...new Set(allQueries)].slice(0, 5);

    // Search in parallel
    const searchPromises = uniqueQueries.flatMap(q => [
      searchSpotify(q, 3),
      searchAppleMusic(q, 3),
    ]);
    const searchResults = await Promise.all(searchPromises);
    const allTracks = searchResults.flat();

    // Deduplicate by title+artist (case-insensitive)
    const seen = new Set<string>();
    const uniqueTracks: TrackResult[] = [];
    for (const track of allTracks) {
      const key = `${track.title.toLowerCase()}::${track.artist.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueTracks.push(track);
      }
    }

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

    // Enrich tracks with AI suggestions' emotional data
    const enrichedSongs = uniqueTracks.map((track, i) => {
      const aiMatch = interpretation.songSuggestions.find(
        s => s.title.toLowerCase() === track.title.toLowerCase() ||
             track.title.toLowerCase().includes(s.title.toLowerCase())
      );
      return {
        id: `${track.provider}-${track.trackId}`,
        title: track.title,
        artist: track.artist,
        album: track.album,
        ...(track.releaseYear != null ? { releaseYear: track.releaseYear } : {}),
        artwork: track.artworkUrl,
        emotionalTags: aiMatch?.emotionalTags || interpretation.emotionalProfile.themes.slice(0, 3),
        explanation: aiMatch?.explanation || explPool[i % explPool.length],
        relevanceScore: aiMatch?.relevanceScore || Math.max(60, 95 - i * 5),
        provider: track.provider,
        spotifyUri: track.spotifyUri,
        appleMusicId: track.appleMusicId,
        previewUrl: track.previewUrl,
      };
    });

    // Sort by relevance
    enrichedSongs.sort((a, b) => b.relevanceScore - a.relevanceScore);

    const cm = interpretation.conversationMemoryUpdate;
    const ut = interpretation.userTasteProfileUpdate;

    const result = {
      emotionalProfile: interpretation.emotionalProfile,
      narrativeReply: interpretation.narrativeReply || '',
      songs: enrichedSongs.slice(0, 8),
      adjacentInterpretations: interpretation.adjacentInterpretations,
      conversationMemoryUpdate: cm ? {
        threadSummary: cm.threadSummary,
        standardAxes: normalizeStandardAxes(cm.standardAxes as Record<string, unknown>),
      } : undefined,
      userTasteProfileUpdate: ut,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    console.error('music-search error:', err);
    const message = err instanceof Error ? err.message : String(err);
    const status = message?.includes('Rate limited') ? 429
      : message?.includes('credits') ? 402 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
