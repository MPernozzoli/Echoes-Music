import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  "w-[min(100vw-1.5rem,22rem)] max-h-[min(72vh,30rem)] overflow-y-auto border border-border bg-popover p-0 text-popover-foreground shadow-2xl";

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
  const { t, i18n } = useTranslation();
  const sortedListens = [...listenHistory].sort(
    (a, b) => new Date(b.listenedAt).getTime() - new Date(a.listenedAt).getTime()
  );

  const panelOpenChange =
    (id: DockPopoverId) => (open: boolean) =>
      setDockPopover(open ? id : dockPopover === id ? null : dockPopover);

  return (
    <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
      <Popover open={dockPopover === "profile"} onOpenChange={panelOpenChange("profile")}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(DOCK_ICON_BTN, !currentResult && "opacity-40 pointer-events-none")}
            title={t("dock.emotionalProfile")}
            disabled={!currentResult}
          >
            <Sparkles className="w-4 h-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" sideOffset={10} className={popoverContentClass}>
          {currentResult && tagSong && (
            <div className="p-4 space-y-3">
              <p className="text-xs font-body text-muted-foreground uppercase tracking-wider">{t("dock.emotionalProfile")}</p>
              <EmotionalProfileCard profile={currentResult.emotionalProfile} />
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-body text-[hsl(141,73%,48%)] font-medium px-2 py-0.5 rounded-full bg-[hsl(141,73%,48%)]/15">
                    {t("chat.matchLabel", { score: tagSong.relevanceScore })}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {tagSong.emotionalTags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-body"
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
          <button type="button" className={DOCK_ICON_BTN} title={t("dock.listenHistory")}>
            <Clock className="w-4 h-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" sideOffset={10} className={popoverContentClass}>
          <div className="p-3 border-b border-border flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Headphones className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-body font-medium text-foreground truncate">{t("dock.listenHistory")}</span>
            </div>
            <Button variant="ghost" size="sm" className="text-xs h-8 shrink-0 text-muted-foreground hover:text-foreground" asChild>
              <Link to="/history" onClick={() => setDockPopover(null)}>
                {t("dock.seeAll")}
              </Link>
            </Button>
          </div>
          <div className="p-2 max-h-[min(60vh,22rem)] overflow-y-auto">
            {sortedListens.length === 0 ? (
              <p className="text-xs text-muted-foreground font-body text-center py-8 px-2">
                {t("dock.listenEmpty")}
              </p>
            ) : (
              <ul className="space-y-1">
                {sortedListens.slice(0, 40).map((e) => {
                  const chatOk = historyChatExists(e.conversationId);
                  return (
                    <li
                      key={e.id}
                      className="flex gap-2 rounded-lg p-2 hover:bg-muted/80 transition-colors text-left items-center"
                    >
                      <img
                        src={e.song.artwork}
                        alt=""
                        className="w-10 h-10 rounded-md object-cover bg-muted shrink-0"
                        width={40}
                        height={40}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground truncate font-body">{e.song.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate font-body">{e.song.artist}</p>
                        <p className="text-[10px] text-muted-foreground/80 truncate font-body mt-0.5">&quot;{e.prompt}&quot;</p>
                        <p className="text-[10px] text-muted-foreground font-body tabular-nums mt-0.5">
                          {new Date(e.listenedAt).toLocaleString(i18n.language, {
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
                          title={t("dock.replay")}
                          onClick={() => onReplayHistoryEntry(e)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-[hsl(141,73%,52%)] hover:bg-muted transition-colors"
                        >
                          <Play className="w-4 h-4 fill-current" />
                        </button>
                        <button
                          type="button"
                          title={chatOk ? t("dock.openChat") : t("dock.chatUnavailable")}
                          disabled={!chatOk}
                          onClick={() => chatOk && onOpenHistoryChat(e)}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            chatOk
                              ? "text-muted-foreground hover:text-foreground hover:bg-muted"
                              : "text-muted-foreground/40 cursor-not-allowed"
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
            title={t("dock.queue")}
            disabled={queue.length === 0}
          >
            <ListMusic className="w-4 h-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" sideOffset={10} className={popoverContentClass}>
          <div className="p-3 border-b border-border">
            <p className="text-sm font-body font-medium text-foreground">{t("dock.queue")}</p>
            <p className="text-[11px] text-muted-foreground font-body">{t("dock.queueCount", { count: queue.length })}</p>
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
