import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, GripVertical, Heart, Trash2 } from "lucide-react";
import type { Song } from "@/data/mockData";
import { cn } from "@/lib/utils";

const DRAG_MIME = "application/x-echoes-queue-index";

function ActiveWaveIndicator({ label }: { label: string }) {
  return (
    <span className="inline-flex items-end justify-center gap-0.5 h-4 w-5" aria-label={label}>
      <span className="w-0.5 rounded-full bg-primary origin-bottom h-2 animate-wave-bars [animation-delay:0ms]" />
      <span className="w-0.5 rounded-full bg-primary origin-bottom h-3 animate-wave-bars [animation-delay:120ms]" />
      <span className="w-0.5 rounded-full bg-primary origin-bottom h-2 animate-wave-bars [animation-delay:240ms]" />
    </span>
  );
}

interface TrackQueueProps {
  songs: Song[];
  currentIndex: number;
  onSelect: (index: number) => void;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  onReorder?: (from: number, to: number) => void;
  onRemove?: (index: number) => void;
  variant?: "default" | "dock";
}

const TrackQueue = ({
  songs,
  currentIndex,
  onSelect,
  isFavorite,
  onToggleFavorite,
  onReorder,
  onRemove,
  variant = "default",
}: TrackQueueProps) => {
  const { t } = useTranslation();
  const activeRef = useRef<HTMLDivElement | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [currentIndex]);

  const handleDragStart = useCallback(
    (e: React.DragEvent, index: number) => {
      if (!onReorder) return;
      e.dataTransfer.setData(DRAG_MIME, String(index));
      e.dataTransfer.effectAllowed = "move";
    },
    [onReorder],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      if (!onReorder) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverIndex(index);
    },
    [onReorder],
  );

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, dropIndex: number) => {
      if (!onReorder) return;
      e.preventDefault();
      setDragOverIndex(null);
      const raw = e.dataTransfer.getData(DRAG_MIME);
      const from = parseInt(raw, 10);
      if (Number.isNaN(from) || from === dropIndex) return;
      onReorder(from, dropIndex);
    },
    [onReorder],
  );

  const handleDragEnd = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const isDock = variant === "dock";

  return (
    <div className="max-h-[min(50vh,22rem)] overflow-y-auto overflow-x-hidden pr-1 space-y-1 scroll-smooth scrollbar-thin">
      {songs.map((song, i) => {
        const isActive = i === currentIndex;
        const rowActive = isActive
          ? "bg-primary/12 border border-primary/25 shadow-sm bg-gradient-to-r from-primary/5 to-transparent"
          : "hover:bg-muted/70 border border-transparent";

        const titleClass = isActive ? "text-primary font-semibold" : "text-foreground";

        const dragOverRing =
          dragOverIndex === i && onReorder ? "ring-2 ring-primary/35 ring-inset rounded-xl" : "";

        return (
          <div
            key={`${i}-${song.id}`}
            ref={isActive ? activeRef : undefined}
            role="listitem"
            onDragOver={(e) => handleDragOver(e, i)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, i)}
            onDragEnd={handleDragEnd}
            className={cn(
              "w-full flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 rounded-xl transition-all text-left group",
              rowActive,
              dragOverRing,
            )}
          >
            {onReorder && (
              <div className="flex flex-col shrink-0 gap-0">
                <button
                  type="button"
                  title={t("trackQueue.moveUp")}
                  disabled={i === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onReorder(i, i - 1);
                  }}
                  className="p-0.5 rounded-md disabled:opacity-25 disabled:pointer-events-none text-muted-foreground hover:text-foreground"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title={t("trackQueue.moveDown")}
                  disabled={i === songs.length - 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    onReorder(i, i + 1);
                  }}
                  className="p-0.5 rounded-md disabled:opacity-25 disabled:pointer-events-none text-muted-foreground hover:text-foreground"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {onReorder && (
              <button
                type="button"
                draggable
                onDragStart={(e) => handleDragStart(e, i)}
                title={t("trackQueue.dragReorder")}
                className={cn(
                  "touch-none p-1.5 rounded-lg cursor-grab active:cursor-grabbing shrink-0",
                  "bg-muted/50 border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/25",
                )}
                aria-label={t("trackQueue.dragReorder")}
              >
                <GripVertical className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => onSelect(i)}
              className="flex flex-1 min-w-0 items-center gap-2 sm:gap-3 text-left py-0.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ringGlow/40"
            >
              <span
                className={cn(
                  "text-xs font-body w-6 sm:w-7 flex items-center justify-center shrink-0 tabular-nums",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                {isActive ? <ActiveWaveIndicator label={t("searchResultTrackList.nowPlaying")} /> : i + 1}
              </span>

              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden bg-muted shrink-0 ring-1 ring-border/40 shadow-sm">
                <img
                  src={song.artwork}
                  alt={song.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  width={44}
                  height={44}
                  draggable={false}
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-body font-medium truncate", titleClass)}>{song.title}</p>
                <p className="text-xs font-body truncate text-muted-foreground">{song.artist}</p>
              </div>

              <span className="text-[11px] font-body shrink-0 tabular-nums text-muted-foreground">{song.relevanceScore}%</span>
            </button>

            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                title={isFavorite(song.id) ? t("trackQueue.removeFavorite") : t("trackQueue.addFavorite")}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(song.id);
                }}
                className={cn(
                  "p-1.5 rounded-full transition-colors",
                  isDock ? "hover:bg-muted text-muted-foreground" : "hover:bg-muted/80 text-muted-foreground",
                )}
              >
                <Heart
                  className={cn(
                    "w-4 h-4",
                    isFavorite(song.id) ? "fill-primary text-primary" : "",
                  )}
                />
              </button>

              {onRemove && (
                <button
                  type="button"
                  title={t("trackQueue.removeFromQueue")}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(i);
                  }}
                  className={cn(
                    "p-1.5 rounded-full transition-colors",
                    isDock
                      ? "hover:bg-destructive/15 text-muted-foreground hover:text-destructive"
                      : "hover:bg-destructive/10 text-muted-foreground hover:text-destructive",
                  )}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TrackQueue;
