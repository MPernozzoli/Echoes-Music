import { Link } from "react-router-dom";
import { Sparkles, Clock, ListMusic, Headphones, Play, MessageSquare } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { DOCK_ICON_BTN } from "@/components/PlayerDockChrome";
import EmotionalProfileCard from "@/components/EmotionalProfile";
import TrackQueue from "@/components/TrackQueue";
import type { SearchResult, Song, ListenHistoryEntry } from "@/data/mockData";
import { cn } from "@/lib/utils";

export type DockPopoverId = "profile" | "history" | "queue";

interface DiscoverDockPanelActionsProps {
  dockPopover: DockPopoverId | null;
  setDockPopover: (v: DockPopoverId | null) => void;
  currentResult: SearchResult | null;
  tagSong: Song | null | undefined;
  queue: Song[];
  currentIndex: number;
  setCurrentIndex: (i: number) => void;
  reorderQueue: (from: number, to: number) => void;
  removeFromQueue: (index: number) => void;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  listenHistory: ListenHistoryEntry[];
  historyChatExists: (conversationId: string) => boolean;
  onReplayHistoryEntry: (entry: ListenHistoryEntry) => void;
  onOpenHistoryChat: (entry: ListenHistoryEntry) => void;
}

const popoverContentClass =
  "w-[min(100vw-1.5rem,22rem)] max-h-[min(72vh,30rem)] overflow-y-auto border-zinc-700 bg-zinc-950 p-0 text-zinc-100 shadow-2xl";

export function DiscoverDockPanelActions({
  dockPopover,
  setDockPopover,
  currentResult,
  tagSong,
  queue,
  currentIndex,
  setCurrentIndex,
  reorderQueue,
  removeFromQueue,
  isFavorite,
  onToggleFavorite,
  listenHistory,
  historyChatExists,
  onReplayHistoryEntry,
  onOpenHistoryChat,
}: DiscoverDockPanelActionsProps) {
  const sortedListens = [...listenHistory].sort(
    (a, b) => new Date(b.listenedAt).getTime() - new Date(a.listenedAt).getTime()
  );

  const panelOpenChange =
    (id: DockPopoverId) => (open: boolean) =>
      setDockPopover((cur) => (open ? id : cur === id ? null : cur));

  return (
    <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
      <Popover open={dockPopover === "profile"} onOpenChange={panelOpenChange("profile")}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(DOCK_ICON_BTN, !currentResult && "opacity-40 pointer-events-none")}
            title="Profilo emotivo"
            disabled={!currentResult}
          >
            <Sparkles className="w-4 h-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" sideOffset={10} className={popoverContentClass}>
          {currentResult && tagSong && (
            <div className="p-4 space-y-3">
              <p className="text-xs font-body text-zinc-500 uppercase tracking-wider">Profilo emotivo</p>
              <EmotionalProfileCard profile={currentResult.emotionalProfile} />
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-body text-[hsl(141,73%,48%)] font-medium px-2 py-0.5 rounded-full bg-[hsl(141,73%,48%)]/15">
                    {tagSong.relevanceScore}% match
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {tagSong.emotionalTags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-body"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>

      <Popover open={dockPopover === "history"} onOpenChange={panelOpenChange("history")}>
        <PopoverTrigger asChild>
          <button type="button" className={DOCK_ICON_BTN} title="Cronologia ascolti">
            <Clock className="w-4 h-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" sideOffset={10} className={popoverContentClass}>
          <div className="p-3 border-b border-zinc-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Headphones className="w-4 h-4 text-zinc-500 shrink-0" />
              <span className="text-sm font-body font-medium text-white truncate">Cronologia ascolti</span>
            </div>
            <Button variant="ghost" size="sm" className="text-xs h-8 shrink-0 text-zinc-400 hover:text-white" asChild>
              <Link to="/history" onClick={() => setDockPopover(null)}>
                Tutto
              </Link>
            </Button>
          </div>
          <div className="p-2 max-h-[min(60vh,22rem)] overflow-y-auto">
            {sortedListens.length === 0 ? (
              <p className="text-xs text-zinc-500 font-body text-center py-8 px-2">
                Nessun ascolto registrato. Avvia la riproduzione dalla chat.
              </p>
            ) : (
              <ul className="space-y-1">
                {sortedListens.slice(0, 40).map((e) => {
                  const chatOk = historyChatExists(e.conversationId);
                  return (
                    <li
                      key={e.id}
                      className="flex gap-2 rounded-lg p-2 hover:bg-zinc-900/90 transition-colors text-left items-center"
                    >
                      <img
                        src={e.song.artwork}
                        alt=""
                        className="w-10 h-10 rounded-md object-cover bg-zinc-800 shrink-0"
                        width={40}
                        height={40}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-white truncate font-body">{e.song.title}</p>
                        <p className="text-[11px] text-zinc-500 truncate font-body">{e.song.artist}</p>
                        <p className="text-[10px] text-zinc-600 truncate font-body mt-0.5">&quot;{e.prompt}&quot;</p>
                        <p className="text-[10px] text-zinc-600 font-body tabular-nums mt-0.5">
                          {new Date(e.listenedAt).toLocaleString("it-IT", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          type="button"
                          title="Riproduci"
                          onClick={() => onReplayHistoryEntry(e)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-[hsl(141,73%,52%)] hover:bg-zinc-800/80 transition-colors"
                        >
                          <Play className="w-4 h-4 fill-current" />
                        </button>
                        <button
                          type="button"
                          title={chatOk ? "Apri chat" : "Chat non disponibile"}
                          disabled={!chatOk}
                          onClick={() => chatOk && onOpenHistoryChat(e)}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            chatOk
                              ? "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/80"
                              : "text-zinc-700 cursor-not-allowed"
                          )}
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <Popover open={dockPopover === "queue"} onOpenChange={panelOpenChange("queue")}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(DOCK_ICON_BTN, queue.length === 0 && "opacity-40 pointer-events-none")}
            title="Coda"
            disabled={queue.length === 0}
          >
            <ListMusic className="w-4 h-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" sideOffset={10} className={popoverContentClass}>
          <div className="p-3 border-b border-zinc-800">
            <p className="text-sm font-body font-medium text-white">Coda</p>
            <p className="text-[11px] text-zinc-500 font-body">{queue.length} brani</p>
          </div>
          <div className="p-2 max-h-[min(60vh,22rem)] overflow-y-auto">
            <TrackQueue
              variant="dock"
              songs={queue}
              currentIndex={currentIndex}
              onSelect={(i) => {
                setCurrentIndex(i);
                setDockPopover(null);
              }}
              isFavorite={isFavorite}
              onToggleFavorite={onToggleFavorite}
              onReorder={reorderQueue}
              onRemove={removeFromQueue}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
