import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, GripVertical, Heart, Trash2 } from "lucide-react";
import type { Song } from "@/data/mockData";
import { cn } from "@/lib/utils";

const DRAG_MIME = "application/x-echoes-queue-index";

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
    [onReorder]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      if (!onReorder) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverIndex(index);
    },
    [onReorder]
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
    [onReorder]
  );

  const handleDragEnd = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const isDock = variant === "dock";

  return (
    <div className="max-h-[min(50vh,22rem)] overflow-y-auto overflow-x-hidden pr-1 space-y-1 scroll-smooth">
      {songs.map((song, i) => {
        const isActive = i === currentIndex;
        const rowActive = isDock
          ? isActive
            ? "bg-[hsl(141,73%,48%)]/12 border border-[hsl(141,73%,48%)]/25"
            : "hover:bg-muted/80 border border-transparent"
          : isActive
            ? "bg-primary/10 border border-primary/20"
            : "hover:bg-muted/60 border border-transparent";

        const titleClass = isDock
          ? isActive
            ? "text-[hsl(141,73%,52%)]"
            : "text-foreground"
          : isActive
            ? "text-primary"
            : "text-foreground";

        const posClass = isDock
          ? isActive
            ? "text-[hsl(141,73%,52%)] font-semibold"
            : "text-muted-foreground"
          : isActive
            ? "text-primary font-semibold"
            : "text-muted-foreground";

        const dragOverRing =
          dragOverIndex === i && onReorder ? "ring-2 ring-primary/40 ring-inset rounded-xl" : "";

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
              dragOverRing
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
                  className={cn(
                    "p-0.5 rounded-md disabled:opacity-25 disabled:pointer-events-none",
                    isDock ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
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
                  className={cn(
                    "p-0.5 rounded-md disabled:opacity-25 disabled:pointer-events-none",
                    isDock ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
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
                  "touch-none p-1 rounded-md cursor-grab active:cursor-grabbing shrink-0",
                  isDock ? "text-muted-foreground/80 hover:text-muted-foreground" : "text-muted-foreground/70 hover:text-muted-foreground"
                )}
                aria-label={t("trackQueue.dragReorder")}
              >
                <GripVertical className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => onSelect(i)}
              className="flex flex-1 min-w-0 items-center gap-2 sm:gap-3 text-left py-0.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <span className={cn("text-xs font-body w-5 text-center shrink-0 tabular-nums", posClass)}>
                {isActive ? "▶" : i + 1}
              </span>

              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg overflow-hidden bg-muted shrink-0">
                <img
                  src={song.artwork}
                  alt={song.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  width={40}
                  height={40}
                  draggable={false}
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-body font-medium truncate", titleClass)}>{song.title}</p>
                <p
                  className={cn(
                    "text-xs font-body truncate",
                    isDock ? "text-muted-foreground" : "text-muted-foreground"
                  )}
                >
                  {song.artist}
                </p>
              </div>

              <span
                className={cn(
                  "text-[10px] font-body shrink-0 tabular-nums",
                  isDock ? "text-muted-foreground" : "text-muted-foreground"
                )}
              >
                {song.relevanceScore}%
              </span>
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
                  isDock ? "hover:bg-muted text-muted-foreground" : "hover:bg-muted/80 text-muted-foreground"
                )}
              >
                <Heart
                  className={cn(
                    "w-4 h-4",
                    isFavorite(song.id)
                      ? isDock
                        ? "fill-[hsl(141,73%,48%)] text-[hsl(141,73%,48%)]"
                        : "fill-primary text-primary"
                      : ""
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
                      : "hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
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
