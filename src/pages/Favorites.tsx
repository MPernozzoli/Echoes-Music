import { useTranslation } from "react-i18next";
import AppLayout from "@/components/AppLayout";
import SongCard from "@/components/SongCard";
import { useApp } from "@/context/useApp";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

const Favorites = () => {
  const { t } = useTranslation();
  const { favorites, toggleFavorite } = useApp();

  const handleToggle = (songId: string) => {
    const song = favorites.find((s) => s.id === songId);
    if (song) toggleFavorite(song);
  };

  const collage = favorites.slice(0, 5);

  return (
    <AppLayout>
      <div className="relative max-w-3xl mx-auto px-4 md:px-6 py-8 pb-24 md:pb-10 overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-artwork-radial opacity-40" aria-hidden />

        <div className="relative mb-10">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">{t("favorites.title")}</h1>
          <p className="text-muted-foreground font-body text-sm md:text-base">{t("favorites.subtitle")}</p>
        </div>

        {favorites.length === 0 ? (
          <div className="relative text-center py-24 surface-card rounded-3xl border border-border/50">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-5">
              <Heart className="w-8 h-8 text-primary" />
            </div>
            <p className="text-muted-foreground font-body max-w-xs mx-auto">{t("favorites.empty")}</p>
          </div>
        ) : (
          <>
            {collage.length > 0 && (
              <div className="relative flex justify-center gap-2 md:gap-3 mb-10 -mt-2">
                {collage.map((song, idx) => (
                  <div
                    key={song.id}
                    className={cn(
                      "relative rounded-2xl overflow-hidden shadow-elevated ring-2 ring-background",
                      "w-14 h-14 sm:w-16 sm:h-16 md:w-[4.5rem] md:h-[4.5rem]",
                      idx === 0 && "z-30 rotate-[-6deg] translate-y-1",
                      idx === 1 && "z-20 rotate-[4deg] -translate-y-0.5",
                      idx === 2 && "z-40 scale-110 -translate-y-1 ring-primary/30",
                      idx === 3 && "z-10 rotate-[5deg] translate-y-1",
                      idx === 4 && "z-0 rotate-[-3deg]",
                    )}
                  >
                    <img src={song.artwork} alt="" className="w-full h-full object-cover" width={72} height={72} />
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-5 relative">
              {favorites.map((song, i) => (
                <SongCard key={song.id} {...song} index={i} isFavorite onToggleFavorite={handleToggle} />
              ))}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Favorites;
