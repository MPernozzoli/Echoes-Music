export interface SongVersion {
  id: string;
  title: string;
  artist: string;
  album: string;
  releaseYear?: number;
  provider?: 'spotify' | 'apple_music' | 'youtube_music' | 'mock';
  spotifyUri?: string;
  appleMusicId?: string;
  youtubeMusicVideoId?: string;
  youtubeMusicUrl?: string;
  previewUrl?: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  /** Anno di pubblicazione del brano/album se noto (API) */
  releaseYear?: number;
  artwork: string;
  emotionalTags: string[];
  explanation: string;
  relevanceScore: number;
  spotifyUrl?: string;
  provider?: 'spotify' | 'apple_music' | 'youtube_music' | 'mock';
  spotifyUri?: string;
  appleMusicId?: string;
  youtubeMusicVideoId?: string;
  youtubeMusicUrl?: string;
  previewUrl?: string;
  alternateVersions?: SongVersion[];
}

/** Dopo trackSearch/trackResults, per feedback sui singoli brani */
export interface SearchResultTracking {
  searchId: string;
  resultIdsBySongId: Record<string, string>;
}

export interface SearchResult {
  id: string;
  prompt: string;
  timestamp: string;
  emotionalProfile: EmotionalProfile;
  songs: Song[];
  adjacentInterpretations: string[];
  /** Paragrafo discorsivo (senza elenco titoli); i brani sono mostrati sotto come chip con tooltip */
  narrativeReply?: string;
  tracking?: SearchResultTracking;
  searchMode?: "search" | "lucky" | "creator_trends";
  /** pick = lista con azioni coda; inline = avviata subito in coda globale */
  playbackPresentation?: "pick" | "inline";
}

/** Voce cronologia ascolti, legata alla chat che ha generato il risultato */
export interface ListenHistoryEntry {
  id: string;
  listenedAt: string;
  conversationId: string;
  searchResultId: string;
  prompt: string;
  chatTitle?: string;
  song: Song;
}

export interface EmotionalProfile {
  themes: string[];
  mood: string;
  energy: string;
  intimacy: string;
  catharsis: string;
  emotionalTension: string;
}

export { examplePrompts } from "@/lib/discoverPromptSuggestions";

/** Copertine album reali (CDN Deezer), coerenti con titolo/album di ogni voce mock. */
const artworks = [
  "https://cdn-images.dzcdn.net/images/cover/bb1f906b81ee6bd532762a6a64d8bdc8/1000x1000-000000-80-0-0.jpg", // Lord Huron — Strange Trails
  "https://cdn-images.dzcdn.net/images/cover/2af56dee5db12e4af6323afa26257ccf/1000x1000-000000-80-0-0.jpg", // Bon Iver — For Emma, Forever Ago
  "https://cdn-images.dzcdn.net/images/cover/c82449a6fb6a40d947b79a2328ae0eb6/1000x1000-000000-80-0-0.jpg", // M83 — Hurry Up, We're Dreaming
  "https://cdn-images.dzcdn.net/images/cover/1457f0d27076538d484625fa706541b7/1000x1000-000000-80-0-0.jpg", // Bon Iver — Bon Iver
  "https://cdn-images.dzcdn.net/images/cover/763cd442c23f5d9c64d8f9923a9e814c/1000x1000-000000-80-0-0.jpg", // James Blake — Overgrown
  "https://cdn-images.dzcdn.net/images/cover/2af56dee5db12e4af6323afa26257ccf/1000x1000-000000-80-0-0.jpg", // stesso album For Emma (Re: Stacks)
] as const;

export const mockSongs: Song[] = [
  {
    id: "1",
    title: "The Night We Met",
    artist: "Lord Huron",
    album: "Strange Trails",
    artwork: artworks[0],
    emotionalTags: ["longing", "regret", "tenderness"],
    explanation: "This song captures the ache of wanting to return to a moment before things fell apart — a quiet plea to undo the distance that grew between two people.",
    relevanceScore: 97,
  },
  {
    id: "2",
    title: "Skinny Love",
    artist: "Bon Iver",
    album: "For Emma, Forever Ago",
    artwork: artworks[1],
    emotionalTags: ["vulnerability", "isolation", "raw emotion"],
    explanation: "Written in a cabin during emotional exile, this track mirrors the fragility of holding on to something beautiful that's already breaking.",
    relevanceScore: 94,
  },
  {
    id: "3",
    title: "Midnight City",
    artist: "M83",
    album: "Hurry Up, We're Dreaming",
    artwork: artworks[2],
    emotionalTags: ["nocturnal", "freedom", "euphoria"],
    explanation: "The synths cascade like city lights blurring past a car window — capturing that electric solitude of being alone in a crowd after dark.",
    relevanceScore: 91,
  },
  {
    id: "4",
    title: "Holocene",
    artist: "Bon Iver",
    album: "Bon Iver",
    artwork: artworks[3],
    emotionalTags: ["smallness", "peace", "perspective"],
    explanation: "A meditation on realizing your place in something vast. The lyric 'I was not magnificent' isn't defeat — it's relief, a letting go of the need to be more.",
    relevanceScore: 89,
  },
  {
    id: "5",
    title: "Retrograde",
    artist: "James Blake",
    album: "Overgrown",
    artwork: artworks[4],
    emotionalTags: ["support", "turmoil", "devotion"],
    explanation: "When the bass drops and the world fractures around you, this song says: I'll stay. A sonic promise of loyalty in emotional freefall.",
    relevanceScore: 86,
  },
  {
    id: "6",
    title: "Re: Stacks",
    artist: "Bon Iver",
    album: "For Emma, Forever Ago",
    artwork: artworks[5],
    emotionalTags: ["acceptance", "quiet hope", "closure"],
    explanation: "The sound of someone who has cried everything out and found a strange, gentle calm on the other side. Not happy — but present.",
    relevanceScore: 83,
  },
];

export const mockSearchResults: SearchResult[] = [
  {
    id: "sr1",
    prompt: "Songs about past friendships that ended without a fight",
    timestamp: "2024-03-15T14:30:00Z",
    emotionalProfile: {
      themes: ["loss", "nostalgia", "quiet grief"],
      mood: "Melancholic, reflective",
      energy: "Low to moderate",
      intimacy: "High — deeply personal",
      catharsis: "Gentle release, not dramatic",
      emotionalTension: "The gap between what was and what is",
    },
    songs: [mockSongs[0], mockSongs[1], mockSongs[5]],
    adjacentInterpretations: [
      "Songs about growing apart from someone you still care about",
      "Music that captures the silence after a friendship fades",
      "Songs for accepting that some people were meant to be temporary",
    ],
  },
  {
    id: "sr2",
    prompt: "Music for walking alone in a city at night",
    timestamp: "2024-03-14T22:15:00Z",
    emotionalProfile: {
      themes: ["solitude", "urban beauty", "freedom"],
      mood: "Contemplative, alive",
      energy: "Moderate — steady rhythm",
      intimacy: "Medium — alone but not lonely",
      catharsis: "Expansive awareness",
      emotionalTension: "Being surrounded yet separate",
    },
    songs: [mockSongs[2], mockSongs[4], mockSongs[3]],
    adjacentInterpretations: [
      "Songs that sound like neon reflections on wet pavement",
      "Music for late-night drives with no destination",
      "Songs that make the city feel like it belongs to you",
    ],
  },
  {
    id: "sr3",
    prompt: "Songs that sound like emotional relief after a difficult time",
    timestamp: "2024-03-13T09:45:00Z",
    emotionalProfile: {
      themes: ["healing", "release", "renewal"],
      mood: "Cathartic, gentle",
      energy: "Building slowly",
      intimacy: "High — raw and honest",
      catharsis: "Deep — the exhale after holding your breath",
      emotionalTension: "The weight lifting",
    },
    songs: [mockSongs[5], mockSongs[3], mockSongs[4]],
    adjacentInterpretations: [
      "Music that feels like the first warm day after winter",
      "Songs for the moment you realize you're going to be okay",
      "Music that sounds like forgiveness — of yourself",
    ],
  },
];

export const mockFavorites: Song[] = [mockSongs[0], mockSongs[2], mockSongs[5]];
