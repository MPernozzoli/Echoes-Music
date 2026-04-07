import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useConversations } from "@/context/ConversationContext";
import { useApp } from "@/context/AppContext";
import { Clock, ArrowRight, Trash2, MessageSquare, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const History = () => {
  const navigate = useNavigate();
  const { conversations, deleteConversation, selectConversation } = useConversations();
  const { listenHistory, clearListenHistory } = useApp();

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
            <h1 className="font-display text-3xl font-bold">Storico</h1>
            <TabsList className="w-full sm:w-auto shrink-0">
              <TabsTrigger value="chats" className="gap-2 flex-1 sm:flex-initial">
                <MessageSquare className="w-4 h-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="listens" className="gap-2 flex-1 sm:flex-initial">
                <Headphones className="w-4 h-4" />
                Ascolti
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="chats" className="mt-0">
            <p className="text-muted-foreground font-body text-sm mb-8">
              Ogni conversazione ha la propria memoria emotiva; il profilo globale si affina con l&apos;uso.
            </p>

            {sorted.length === 0 ? (
              <div className="text-center py-20">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-body">Nessuna chat ancora. Inizia da Discover.</p>
                <Button className="mt-6" variant="outline" onClick={() => navigate("/discover")}>
                  Vai a Discover
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
                      className="w-full glass-card rounded-2xl p-5 hover:border-primary/20 transition-all group animate-fade-up flex gap-3 items-stretch"
                      style={{ animationDelay: `${i * 60}ms`, animationFillMode: "backwards" }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          selectConversation(c.id);
                          navigate(`/discover?conversation=${c.id}`);
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
                          {new Date(c.updatedAt).toLocaleDateString("it-IT", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                          {" · "}
                          {c.messages.length} messaggi
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
                            navigate(`/discover?conversation=${c.id}`);
                          }}
                          className="p-2 rounded-lg text-muted-foreground hover:text-primary transition-colors"
                          aria-label="Apri chat"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteConversation(c.id)}
                          className="p-2 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                          aria-label="Elimina chat"
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
              <p className="text-muted-foreground font-body text-sm flex-1">
                Brani avviati da play (anteprima o Apple Music in app). Da qui riapri la chat che ha generato il
                risultato.
              </p>
              {sortedListens.length > 0 && (
                <Button variant="ghost" size="sm" className="shrink-0 text-muted-foreground" onClick={clearListenHistory}>
                  Svuota
                </Button>
              )}
            </div>

            {sortedListens.length === 0 ? (
              <div className="text-center py-20">
                <Headphones className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-body">Nessun ascolto registrato. Premi play su Discover.</p>
                <Button className="mt-6" variant="outline" onClick={() => navigate("/discover")}>
                  Vai a Discover
                </Button>
              </div>
            ) : (
              <ul className="space-y-3">
                {sortedListens.map((e, i) => {
                  const chatExists = conversations.some((c) => c.id === e.conversationId);
                  const chatLabel =
                    conversations.find((c) => c.id === e.conversationId)?.title ?? e.chatTitle ?? "Chat";
                  return (
                    <li
                      key={e.id}
                      className="glass-card rounded-2xl p-4 flex gap-3 items-center animate-fade-up"
                      style={{ animationDelay: `${i * 40}ms`, animationFillMode: "backwards" }}
                    >
                      <img
                        src={e.song.artwork}
                        alt=""
                        className="w-14 h-14 rounded-xl object-cover shrink-0 bg-muted"
                        width={56}
                        height={56}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-display text-sm font-semibold text-foreground truncate">{e.song.title}</p>
                        <p className="text-xs text-muted-foreground font-body truncate">
                          {e.song.artist} · {e.song.album}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-body mt-1 truncate" title={chatLabel}>
                          Chat: {chatLabel}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-body mt-0.5 line-clamp-1">
                          Da: &quot;{e.prompt}&quot;
                        </p>
                        <p className="text-[10px] text-muted-foreground font-body mt-0.5">
                          {new Date(e.listenedAt).toLocaleString("it-IT", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0 gap-1"
                        disabled={!chatExists}
                        onClick={() => {
                          if (!chatExists) return;
                          selectConversation(e.conversationId);
                          navigate(`/discover?conversation=${e.conversationId}`);
                        }}
                        title={!chatExists ? "Chat eliminata" : undefined}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Chat
                      </Button>
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
