import AppLayout from "@/components/AppLayout";
import SongCard from "@/components/SongCard";
import { useApp } from "@/context/AppContext";
import { Heart } from "lucide-react";

const Favorites = () => {
  const { favorites, toggleFavorite } = useApp();

  const handleToggle = (songId: string) => {
    const song = favorites.find((s) => s.id === songId);
    if (song) toggleFavorite(song);
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 pb-20 md:pb-8">
        <h1 className="font-display text-3xl font-bold mb-2">Favorites</h1>
        <p className="text-muted-foreground font-body text-sm mb-8">Songs that stayed with you.</p>

        {favorites.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground font-body">No favorites yet. Save songs that resonate.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {favorites.map((song, i) => (
              <SongCard
                key={song.id}
                {...song}
                index={i}
                isFavorite={true}
                onToggleFavorite={handleToggle}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Favorites;
