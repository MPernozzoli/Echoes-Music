import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useApp } from "@/context/AppContext";
import { Clock, ArrowRight, Trash2 } from "lucide-react";

const History = () => {
  const { history, clearHistory } = useApp();
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 pb-20 md:pb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-display text-3xl font-bold">History</h1>
          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive font-body transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
        <p className="text-muted-foreground font-body text-sm mb-8">Your past searches and discoveries.</p>

        {history.length === 0 ? (
          <div className="text-center py-20">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground font-body">No searches yet. Start discovering.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((result, i) => (
              <button
                key={result.id}
                onClick={() => navigate(`/discover?q=${encodeURIComponent(result.prompt)}`)}
                className="w-full text-left glass-card rounded-2xl p-5 hover:border-primary/20 transition-all group animate-fade-up"
                style={{ animationDelay: `${i * 80}ms`, animationFillMode: "backwards" }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-base font-semibold text-foreground leading-snug mb-1">
                      "{result.prompt}"
                    </p>
                    <p className="text-xs text-muted-foreground font-body">
                      {new Date(result.timestamp).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                      {" · "}
                      {result.songs.length} songs
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {result.emotionalProfile.themes.map((theme) => (
                        <span
                          key={theme}
                          className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-body"
                        >
                          {theme}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default History;
