import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import PromptInput from "@/components/PromptInput";
import PromptSuggestions from "@/components/PromptSuggestions";
import SongCard from "@/components/SongCard";
import EmotionalProfileCard from "@/components/EmotionalProfile";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { examplePrompts, mockSearchResults, mockSongs } from "@/data/mockData";
import type { SearchResult } from "@/data/mockData";
import { Lightbulb, RefreshCw } from "lucide-react";

const Discover = () => {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<SearchResult | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set(["1", "6"]));
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = (prompt: string) => {
    setIsLoading(true);
    setHasSearched(true);

    // Simulate AI processing
    setTimeout(() => {
      const matchIndex = Math.floor(Math.random() * mockSearchResults.length);
      const result = {
        ...mockSearchResults[matchIndex],
        prompt,
        timestamp: new Date().toISOString(),
        songs: [...mockSongs].sort(() => Math.random() - 0.5).slice(0, 4 + Math.floor(Math.random() * 3)),
      };
      setCurrentResult(result);
      setIsLoading(false);
    }, 2000);
  };

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) handleSearch(q);
  }, []);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 pb-20 md:pb-8">
        {/* Prompt area */}
        <div className="max-w-2xl mx-auto mb-6">
          <PromptInput onSubmit={handleSearch} isLoading={isLoading} />
        </div>

        {!hasSearched && (
          <div className="max-w-2xl mx-auto mb-12">
            <p className="text-xs text-muted-foreground font-body mb-3 uppercase tracking-wider">Try something like</p>
            <PromptSuggestions suggestions={examplePrompts} onSelect={handleSearch} />
          </div>
        )}

        {/* Empty state */}
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

        {/* Loading */}
        {isLoading && (
          <div className="max-w-2xl mx-auto">
            <p className="text-sm text-muted-foreground font-body mb-4 animate-pulse-soft">
              Interpreting your feelings...
            </p>
            <LoadingSkeleton />
          </div>
        )}

        {/* Results */}
        {currentResult && !isLoading && (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Main feed */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground font-body uppercase tracking-wider mb-1">Results for</p>
              <h2 className="font-display text-xl font-semibold mb-6 text-foreground">
                "{currentResult.prompt}"
              </h2>

              <div className="space-y-4">
                {currentResult.songs.map((song, i) => (
                  <SongCard
                    key={song.id}
                    {...song}
                    index={i}
                    isFavorite={favorites.has(song.id)}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </div>

              {/* Adjacent interpretations */}
              {currentResult.adjacentInterpretations.length > 0 && (
                <div className="mt-10">
                  <div className="flex items-center gap-2 mb-4">
                    <RefreshCw className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground font-body">You may have meant…</p>
                  </div>
                  <div className="space-y-2">
                    {currentResult.adjacentInterpretations.map((interp) => (
                      <button
                        key={interp}
                        onClick={() => handleSearch(interp)}
                        className="block w-full text-left text-sm px-4 py-3 rounded-xl border border-border text-secondary-foreground/70 hover:text-foreground hover:border-primary/20 hover:bg-primary/5 transition-all font-body"
                      >
                        {interp}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Side panel */}
            <div className="lg:w-72 shrink-0">
              <EmotionalProfileCard profile={currentResult.emotionalProfile} />
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Discover;
