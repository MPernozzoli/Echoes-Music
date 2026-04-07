import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, MessageCircle, Search, TrendingUp, ThumbsUp, ThumbsDown, Hash, Activity } from "lucide-react";

interface StatCard {
  label: string;
  value: string | number;
  icon: React.ElementType;
  sub?: string;
}

const Insights = () => {
  const [stats, setStats] = useState<StatCard[]>([]);
  const [topThemes, setTopThemes] = useState<{ theme: string; count: number }[]>([]);
  const [feedbackBreakdown, setFeedbackBreakdown] = useState<{ label: string; count: number }[]>([]);
  const [recentSearches, setRecentSearches] = useState<{ prompt: string; mood: string; created_at: string }[]>([]);
  const [topInteractions, setTopInteractions] = useState<{ type: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    setLoading(true);

    const [searchesRes, resultsRes, interactionsRes, searchFbRes, resultFbRes, trainingRes] = await Promise.all([
      supabase.from("searches").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("search_results").select("*").limit(500),
      supabase.from("result_interactions").select("*").limit(500),
      supabase.from("search_feedback").select("*").limit(200),
      supabase.from("result_feedback").select("*").limit(200),
      supabase.from("anonymized_training_events").select("*").limit(100),
    ]);

    const searches = searchesRes.data ?? [];
    const results = resultsRes.data ?? [];
    const interactions = interactionsRes.data ?? [];
    const searchFb = searchFbRes.data ?? [];
    const resultFb = resultFbRes.data ?? [];
    const training = trainingRes.data ?? [];

    // Stats
    const totalSearches = searches.length;
    const totalResults = results.length;
    const totalInteractions = interactions.length;
    const totalFeedback = searchFb.length + resultFb.length;

    setStats([
      { label: "Searches", value: totalSearches, icon: Search },
      { label: "Results shown", value: totalResults, icon: BarChart3 },
      { label: "Interactions", value: totalInteractions, icon: Activity },
      { label: "Feedback items", value: totalFeedback, icon: MessageCircle },
      { label: "Training events", value: training.length, icon: TrendingUp },
    ]);

    // Top themes
    const themeCounts: Record<string, number> = {};
    searches.forEach((s) => {
      const themes = s.interpreted_themes;
      if (Array.isArray(themes)) {
        (themes as string[]).forEach((t) => {
          themeCounts[t] = (themeCounts[t] || 0) + 1;
        });
      }
    });
    setTopThemes(
      Object.entries(themeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([theme, count]) => ({ theme, count }))
    );

    // Feedback breakdown
    const fbCounts: Record<string, number> = {};
    [...searchFb, ...resultFb].forEach((f) => {
      const label = f.feedback_label;
      fbCounts[label] = (fbCounts[label] || 0) + 1;
    });
    setFeedbackBreakdown(
      Object.entries(fbCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([label, count]) => ({ label, count }))
    );

    // Interaction types
    const intCounts: Record<string, number> = {};
    interactions.forEach((i) => {
      intCounts[i.interaction_type] = (intCounts[i.interaction_type] || 0) + 1;
    });
    setTopInteractions(
      Object.entries(intCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => ({ type, count }))
    );

    // Recent searches
    setRecentSearches(
      searches.slice(0, 8).map((s) => ({
        prompt: s.raw_prompt,
        mood: s.interpretation_summary ?? "—",
        created_at: s.created_at,
      }))
    );

    setLoading(false);
  };

  const maxThemeCount = topThemes[0]?.count ?? 1;
  const maxInteractionCount = topInteractions[0]?.count ?? 1;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 pb-20 md:pb-8">
        <div className="mb-10">
          <p className="text-xs text-muted-foreground font-body uppercase tracking-wider mb-1">Internal</p>
          <h1 className="font-display text-3xl font-bold mb-2">Product Insights</h1>
          <p className="text-muted-foreground font-body text-sm">Quality signals from AI music recommendations.</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass-card rounded-2xl p-6 animate-pulse-soft h-24" />
            ))}
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-10">
              {stats.map((s) => (
                <div key={s.label} className="glass-card rounded-xl p-4 text-center">
                  <s.icon className="w-4 h-4 text-primary mx-auto mb-2" />
                  <p className="font-display text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground font-body mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-10">
              {/* Top Themes */}
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Hash className="w-4 h-4 text-primary" />
                  <h3 className="font-display text-base font-semibold">Top Themes</h3>
                </div>
                {topThemes.length === 0 ? (
                  <p className="text-sm text-muted-foreground font-body">No data yet.</p>
                ) : (
                  <div className="space-y-2">
                    {topThemes.map((t) => (
                      <div key={t.theme} className="flex items-center gap-3">
                        <span className="text-sm font-body text-foreground w-28 truncate">{t.theme}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary/60 rounded-full transition-all"
                            style={{ width: `${(t.count / maxThemeCount) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground font-body w-6 text-right">{t.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Interaction Types */}
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-4 h-4 text-primary" />
                  <h3 className="font-display text-base font-semibold">Interaction Types</h3>
                </div>
                {topInteractions.length === 0 ? (
                  <p className="text-sm text-muted-foreground font-body">No data yet.</p>
                ) : (
                  <div className="space-y-2">
                    {topInteractions.map((t) => (
                      <div key={t.type} className="flex items-center gap-3">
                        <span className="text-sm font-body text-foreground w-32 truncate">{t.type.replace(/_/g, " ")}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent/60 rounded-full transition-all"
                            style={{ width: `${(t.count / maxInteractionCount) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground font-body w-6 text-right">{t.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Feedback Breakdown */}
            <div className="glass-card rounded-2xl p-6 mb-10">
              <div className="flex items-center gap-2 mb-4">
                <MessageCircle className="w-4 h-4 text-primary" />
                <h3 className="font-display text-base font-semibold">Feedback Breakdown</h3>
              </div>
              {feedbackBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground font-body">No feedback yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {feedbackBreakdown.map((f) => {
                    const isPositive = ["good match", "better than expected", "good results"].includes(f.label);
                    return (
                      <div
                        key={f.label}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-body text-sm ${
                          isPositive
                            ? "border-primary/30 text-primary bg-primary/5"
                            : "border-destructive/30 text-destructive bg-destructive/5"
                        }`}
                      >
                        {isPositive ? <ThumbsUp className="w-3 h-3" /> : <ThumbsDown className="w-3 h-3" />}
                        {f.label}
                        <span className="font-semibold">{f.count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Searches */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Search className="w-4 h-4 text-primary" />
                <h3 className="font-display text-base font-semibold">Recent Searches</h3>
              </div>
              {recentSearches.length === 0 ? (
                <p className="text-sm text-muted-foreground font-body">No searches yet.</p>
              ) : (
                <div className="space-y-3">
                  {recentSearches.map((s, i) => (
                    <div key={i} className="flex items-start justify-between gap-4 py-2 border-b border-border/30 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-body text-foreground truncate">"{s.prompt}"</p>
                        <p className="text-xs text-muted-foreground font-body mt-0.5">{s.mood}</p>
                      </div>
                      <p className="text-xs text-muted-foreground font-body shrink-0">
                        {new Date(s.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Insights;
