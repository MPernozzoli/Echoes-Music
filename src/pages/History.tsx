import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useConversations } from "@/context/ConversationContext";
import { Clock, ArrowRight, Trash2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

const History = () => {
  const navigate = useNavigate();
  const { conversations, deleteConversation, selectConversation } = useConversations();

  const sorted = [...conversations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 pb-20 md:pb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-display text-3xl font-bold">Le tue chat</h1>
        </div>
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
                    <p className="text-xs text-muted-foreground font-body line-clamp-2 pl-6">
                      {preview}
                    </p>
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
      </div>
    </AppLayout>
  );
};

export default History;
