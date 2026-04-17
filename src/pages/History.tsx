import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useConversations } from "@/context/useConversations";
import { useApp } from "@/context/useApp";
import { usePlaybackQueue } from "@/context/usePlaybackQueue";
import type { ListenHistoryEntry } from "@/data/mockData";
import { Clock, ArrowRight, Trash2, MessageSquare, Headphones, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const History = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { conversations, deleteConversation, selectConversation } = useConversations();
  const { listenHistory, clearListenHistory } = useApp();
  const { playNowReplace } = usePlaybackQueue();

  const replayFromHistory = useCallback(
    (e: ListenHistoryEntry) => {
      playNowReplace(
        [e.song],
        0,
        true,
        {
          conversationId: e.conversationId,
          searchResultId: e.searchResultId,
          prompt: e.prompt,
        }
      );
      if (conversations.some((c) => c.id === e.conversationId)) {
        selectConversation(e.conversationId);
        navigate(`/chat?conversation=${encodeURIComponent(e.conversationId)}`);
      } else {
        navigate("/chat");
      }
    },
    [playNowReplace, navigate, conversations, selectConversation]
  );

  const sorted = [...conversations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const sortedListens = [...listenHistory].sort(
    (a, b) => new Date(b.listenedAt).getTime() - new Date(a.listenedAt).getTime()
  );

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 pb-20 md:pb-8">
        <Tabs defaultValue="chats" className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h1 className="font-display text-3xl font-bold">{t("history.title")}</h1>
            <TabsList className="w-full sm:w-auto shrink-0">
              <TabsTrigger value="chats" className="gap-2 flex-1 sm:flex-initial">
                <MessageSquare className="w-4 h-4" />
                {t("history.tabChats")}
              </TabsTrigger>
              <TabsTrigger value="listens" className="gap-2 flex-1 sm:flex-initial">
                <Headphones className="w-4 h-4" />
                {t("history.tabListens")}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="chats" className="mt-0">
            <p className="text-muted-foreground font-body text-sm mb-8">{t("history.chatsHint")}</p>

            {sorted.length === 0 ? (
              <div className="text-center py-20">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-body">{t("history.emptyChats")}</p>
                <Button className="mt-6" variant="outline" onClick={() => navigate("/chat")}>
                  {t("history.goToChat")}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {sorted.map((c, i) => {
                  const lastUser = [...c.messages].reverse().find((m) => m.role === "user");
                  const preview = lastUser && lastUser.role === "user" ? lastUser.text : c.title;
                  return (
                    <div
                      key={c.id}
                      className="w-full surface-card rounded-3xl p-5 md:p-6 hover:border-primary/30 transition-all group animate-fade-up flex gap-3 items-stretch border border-border/50"
                      style={{ animationDelay: `${i * 60}ms`, animationFillMode: "backwards" }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          selectConversation(c.id);
                          navigate(`/chat?conversation=${c.id}`);
                        }}
                        className="flex-1 min-w-0 text-left"
                      >
                        <div className="flex items-start gap-2 mb-1">
                          <MessageSquare className="w-4 h-4 text-primary shrink-0 mt-1" />
                          <p className="font-display text-base font-semibold text-foreground leading-snug line-clamp-2">
                            {c.title}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground font-body line-clamp-2 pl-6">{preview}</p>
                        <p className="text-xs text-muted-foreground font-body mt-2 pl-6">
                          {new Date(c.updatedAt).toLocaleDateString(i18n.language, {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                          {" · "}
                          {t("history.messageCount", { count: c.messages.length })}
                        </p>
                        {c.conversationMemory?.standardAxes.dominantThemes &&
                          c.conversationMemory.standardAxes.dominantThemes.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2 pl-6">
                              {c.conversationMemory.standardAxes.dominantThemes.slice(0, 5).map((theme) => (
                                <span
                                  key={theme}
                                  className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-body"
                                >
                                  {theme}
                                </span>
                              ))}
                            </div>
                          )}
                      </button>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            selectConversation(c.id);
                            navigate(`/chat?conversation=${c.id}`);
                          }}
                          className="p-2 rounded-lg text-muted-foreground hover:text-primary transition-colors"
                          aria-label={t("history.openChat")}
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteConversation(c.id)}
                          className="p-2 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                          aria-label={t("history.deleteChat")}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="listens" className="mt-0">
            <div className="flex items-center justify-between gap-2 mb-8">
              <p className="text-muted-foreground font-body text-sm flex-1">{t("history.listensHint")}</p>
              {sortedListens.length > 0 && (
                <Button variant="ghost" size="sm" className="shrink-0 text-muted-foreground" onClick={clearListenHistory}>
                  {t("history.clearListens")}
                </Button>
              )}
            </div>

            {sortedListens.length === 0 ? (
              <div className="text-center py-20">
                <Headphones className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-body">{t("history.emptyListens")}</p>
                <Button className="mt-6" variant="outline" onClick={() => navigate("/chat")}>
                  {t("history.goToChat")}
                </Button>
              </div>
            ) : (
              <ul className="space-y-3">
                {sortedListens.map((e, i) => {
                  const chatExists = conversations.some((c) => c.id === e.conversationId);
                  const chatLabel =
                    conversations.find((c) => c.id === e.conversationId)?.title ?? e.chatTitle ?? t("history.chatLabel");
                  return (
                    <li
                      key={e.id}
                      className="surface-card rounded-3xl p-4 md:p-5 flex gap-4 items-center animate-fade-up border border-border/50"
                      style={{ animationDelay: `${i * 40}ms`, animationFillMode: "backwards" }}
                    >
                      <img
                        src={e.song.artwork}
                        alt=""
                        className="w-16 h-16 rounded-2xl object-cover shrink-0 bg-muted ring-1 ring-border/40 shadow-sm"
                        width={64}
                        height={64}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-display text-sm font-semibold text-foreground truncate">{e.song.title}</p>
                        <p className="text-xs text-muted-foreground font-body truncate">
                          {e.song.artist} · {e.song.album}
                        </p>
                        <p className="text-xs text-muted-foreground font-body mt-1 truncate" title={chatLabel}>
                          {t("history.chatWithTitle", { title: chatLabel })}
                        </p>
                        <p className="text-xs text-muted-foreground font-body mt-1 line-clamp-2 leading-snug">
                          {t("history.fromQuote", { prompt: e.prompt })}
                        </p>
                        <p className="text-xs text-muted-foreground/80 font-body mt-1">
                          {new Date(e.listenedAt).toLocaleString(i18n.language, {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => replayFromHistory(e)}
                          title={t("history.playAgain")}
                        >
                          <Play className="w-3.5 h-3.5" />
                          {t("history.play")}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0 gap-1"
                          disabled={!chatExists}
                          onClick={() => {
                            if (!chatExists) return;
                            selectConversation(e.conversationId);
                            navigate(`/chat?conversation=${encodeURIComponent(e.conversationId)}`);
                          }}
                          title={!chatExists ? t("history.chatDeleted") : undefined}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          {t("nav.chat")}
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default History;
