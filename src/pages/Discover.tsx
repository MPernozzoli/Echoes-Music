import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import PromptInput from "@/components/PromptInput";
import PromptSuggestions from "@/components/PromptSuggestions";
import FullPlayer from "@/components/FullPlayer";
import TrackQueue from "@/components/TrackQueue";
import EmotionalProfileCard from "@/components/EmotionalProfile";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import SearchFeedback from "@/components/SearchFeedback";
import { examplePrompts } from "@/data/mockData";
import type { SearchResult } from "@/data/mockData";
import { useApp } from "@/context/AppContext";
import { trackSearch, trackResults, trackInteraction, maybeCreateTrainingEvent } from "@/services/tracking";
import { Lightbulb, RefreshCw, ListMusic, ChevronDown, ChevronUp, X } from "lucide-react";
import { toast } from "sonner";

const Discover = () => {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<SearchResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [dbSearchId, setDbSearchId] = useState<string | null>(null);
  const [resultIdMap, setResultIdMap] = useState<Record<string, string>>({});
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [showQueue, setShowQueue] = useState(false);
  const [showEmotionalProfile, setShowEmotionalProfile] = useState(false);
  const { toggleFavorite, isFavorite, addToHistory, descriptionLanguage } = useApp();
  const searchParamHandled = useRef(false);

  const handleSearch = async (prompt: string) => {
    setIsLoading(true);
    setHasSearched(true);
    setCurrentTrackIndex(0);
    setShowQueue(false);
    setShowEmotionalProfile(false);

    try {
      const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(`https://${PROJECT_ID}.supabase.co/functions/v1/music-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': ANON_KEY,
        },
        body: JSON.stringify({ prompt, descriptionLanguage }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Search failed' }));
        if (res.status === 429) toast.error("Troppi richieste. Riprova tra poco.");
        else if (res.status === 402) toast.error("Crediti AI esauriti.");
        else toast.error(err.error || "Ricerca fallita");
        setIsLoading(false);
        return;
      }

      const data = await res.json();

      const result: SearchResult = {
        id: `sr-${Date.now()}`,
        prompt,
        timestamp: new Date().toISOString(),
        emotionalProfile: data.emotionalProfile,
        songs: data.songs,
        adjacentInterpretations: data.adjacentInterpretations || [],
      };

      setCurrentResult(result);
      addToHistory(result);
      setIsLoading(false);

      const searchId = await trackSearch({ rawPrompt: prompt, profile: result.emotionalProfile });
      setDbSearchId(searchId);
      if (searchId) {
        const map = await trackResults(searchId, result.songs);
        setResultIdMap(map);
      }
    } catch (err) {
      console.error('Search error:', err);
      toast.error("Errore durante la ricerca");
      setIsLoading(false);
    }
  };

  const handleToggleFavorite = (songId: string) => {
    const song = currentResult?.songs.find((s) => s.id === songId);
    if (song) toggleFavorite(song);
  };

  const handleRefineSearch = (interp: string) => {
    if (dbSearchId) {
      const firstTrackId = currentResult?.songs[0]?.id;
      if (firstTrackId && resultIdMap[firstTrackId]) {
        trackInteraction({
          searchResultId: resultIdMap[firstTrackId],
          searchId: dbSearchId,
          interactionType: "refine_from_result",
          metadata: { refinedTo: interp },
        });
      }
    }
    handleSearch(interp);
  };

  useEffect(() => {
    return () => {
      if (dbSearchId && currentResult) {
        maybeCreateTrainingEvent({
          searchId: dbSearchId,
          rawPrompt: currentResult.prompt,
          interpretationSummary: currentResult.emotionalProfile.mood,
          displayedResults: currentResult.songs.map((s) => ({
            trackId: s.id,
            title: s.title,
            artist: s.artist,
            relevanceScore: s.relevanceScore,
          })),
          interactionSummary: [],
          feedbackSummary: [],
        });
      }
    };
  }, [dbSearchId, currentResult]);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !searchParamHandled.current) {
      searchParamHandled.current = true;
      handleSearch(q);
    }
  }, []);

  const currentSong = currentResult?.songs[currentTrackIndex];

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 pb-20 md:pb-8">
        {/* Search bar */}
        <div className="max-w-2xl mx-auto mb-6">
          <PromptInput onSubmit={handleSearch} isLoading={isLoading} />
        </div>

        {!hasSearched && (
          <div className="max-w-2xl mx-auto mb-12">
            <p className="text-xs text-muted-foreground font-body mb-3 uppercase tracking-wider">Try something like</p>
            <PromptSuggestions suggestions={examplePrompts} onSelect={handleSearch} />
          </div>
        )}

        {!hasSearched && !isLoading && (
          <div className="text-center py-20 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Lightbulb className="w-8 h-8 text-primary" />
            </div>
            <h2 className="font-display text-2xl font-semibold mb-3">What are you feeling?</h2>
            <p className="text-muted-foreground font-body text-sm leading-relaxed">
              Describe a feeling, a memory, or a moment. Echoes will find the songs that match
              the emotional shape of your words.
            </p>
          </div>
        )}

        {isLoading && (
          <div className="max-w-2xl mx-auto">
            <p className="text-sm text-muted-foreground font-body mb-4 animate-pulse-soft">
              Interpreting your feelings...
            </p>
            <LoadingSkeleton />
          </div>
        )}

        {currentResult && !isLoading && currentSong && (
          <div className="flex flex-col items-center">
            {/* Prompt context */}
            <p className="text-xs text-muted-foreground font-body uppercase tracking-wider mb-1">Results for</p>
            <h2 className="font-display text-lg font-semibold mb-6 text-foreground text-center">
              "{currentResult.prompt}"
            </h2>

            {/* Full Player */}
            <FullPlayer
              songs={currentResult.songs}
              currentIndex={currentTrackIndex}
              onChangeIndex={setCurrentTrackIndex}
              isFavorite={isFavorite}
              onToggleFavorite={handleToggleFavorite}
              onShowDetails={() => setShowEmotionalProfile(!showEmotionalProfile)}
            />

            {/* Emotional Profile Tooltip */}
            {showEmotionalProfile && (
              <div className="w-full max-w-lg mt-4 animate-fade-in relative">
                <button
                  onClick={() => setShowEmotionalProfile(false)}
                  className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted transition-colors z-10"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
                <EmotionalProfileCard profile={currentResult.emotionalProfile} />
                {/* Match & Tags for current song */}
                <div className="glass-card rounded-2xl p-4 mt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-body text-primary font-medium px-3 py-1 rounded-full bg-primary/10">
                      {currentSong.relevanceScore}% match
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {currentSong.emotionalTags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2.5 py-0.5 rounded-full bg-emotional-tag/15 text-emotional-tag-foreground/80 font-body"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Queue toggle */}
            {currentResult.songs.length > 1 && (
              <div className="mt-6 w-full max-w-lg">
                <button
                  onClick={() => setShowQueue(!showQueue)}
                  className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl border border-border text-sm font-body text-muted-foreground hover:text-foreground hover:border-primary/20 transition-all"
                >
                  <ListMusic className="w-4 h-4" />
                  <span>
                    {showQueue ? "Hide" : "Show"} queue ({currentResult.songs.length} tracks)
                  </span>
                  {showQueue ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showQueue && (
                  <div className="mt-4 glass-card rounded-2xl p-4 animate-fade-in">
                    <TrackQueue
                      songs={currentResult.songs}
                      currentIndex={currentTrackIndex}
                      onSelect={setCurrentTrackIndex}
                      isFavorite={isFavorite}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Search-level feedback */}
            {dbSearchId && (
              <div className="mt-6 pt-4 border-t border-border/40 w-full max-w-lg">
                <SearchFeedback searchId={dbSearchId} />
              </div>
            )}

            {/* Adjacent interpretations */}
            {currentResult.adjacentInterpretations.length > 0 && (
              <div className="mt-10 w-full max-w-lg">
                <div className="flex items-center gap-2 mb-4">
                  <RefreshCw className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground font-body">You may have meant…</p>
                </div>
                <div className="space-y-2">
                  {currentResult.adjacentInterpretations.map((interp) => (
                    <button
                      key={interp}
                      onClick={() => handleRefineSearch(interp)}
                      className="block w-full text-left text-sm px-4 py-3 rounded-xl border border-border text-secondary-foreground/70 hover:text-foreground hover:border-primary/20 hover:bg-primary/5 transition-all font-body"
                    >
                      {interp}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Discover;
