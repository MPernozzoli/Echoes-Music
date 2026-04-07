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
  }));
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
  searchQueries: string[];
  adjacentInterpretations: string[];
  songSuggestions: Array<{ title: string; artist: string; emotionalTags: string[]; explanation: string; relevanceScore: number }>;
}

async function interpretPrompt(prompt: string, descriptionLanguage?: string): Promise<AIInterpretation> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) throw new Error('LOVABLE_API_KEY not configured');

  const languageInstruction = descriptionLanguage && descriptionLanguage !== 'auto'
    ? `IMPORTANT: The user has set their preferred language to "${descriptionLanguage}". ALL song explanations/descriptions MUST be written in ${descriptionLanguage}, regardless of the language of the user's prompt or the songs themselves. The emotional profile text (mood, energy, etc.) should also be in ${descriptionLanguage}.`
    : `Write explanations and emotional profile text in the same language as the user's prompt.`;

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

## Instructions:
Given the user's prompt:
1. Detect the language of the prompt. If it's not English, respond with song suggestions primarily in that language unless the prompt explicitly asks for another language.
2. Create an emotional profile analyzing themes, mood, energy, intimacy, catharsis, and emotional tension.
3. Generate 4-5 highly specific search queries optimized for Spotify/Apple Music search (use "artist name - song title" format when possible, or genre/mood keywords).
4. Suggest 6-8 specific REAL songs with correct artists. Prioritize songs whose LYRICS match the user's intent. For each: emotional tags (3 words), a poetic explanation connecting the song's actual lyrical content to the prompt (1-2 sentences), and relevance score (0-100).
5. Generate 2-3 adjacent interpretations — creative alternative readings of the prompt.

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
        { role: 'user', content: prompt },
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
            },
            required: ['emotionalProfile', 'searchQueries', 'adjacentInterpretations', 'songSuggestions'],
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

// --- Main handler ---
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'prompt is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 1: AI interpretation
    const interpretation = await interpretPrompt(prompt.trim());

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
        artwork: track.artworkUrl,
        emotionalTags: aiMatch?.emotionalTags || interpretation.emotionalProfile.themes.slice(0, 3),
        explanation: aiMatch?.explanation || `This track resonates with the ${interpretation.emotionalProfile.mood.toLowerCase()} mood of your search.`,
        relevanceScore: aiMatch?.relevanceScore || Math.max(60, 95 - i * 5),
        provider: track.provider,
        spotifyUri: track.spotifyUri,
        appleMusicId: track.appleMusicId,
        previewUrl: track.previewUrl,
      };
    });

    // Sort by relevance
    enrichedSongs.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Return top results
    const result = {
      emotionalProfile: interpretation.emotionalProfile,
      songs: enrichedSongs.slice(0, 8),
      adjacentInterpretations: interpretation.adjacentInterpretations,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('music-search error:', err);
    const status = err.message?.includes('Rate limited') ? 429
      : err.message?.includes('credits') ? 402 : 500;
    return new Response(JSON.stringify({ error: err.message }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
