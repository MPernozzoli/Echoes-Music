import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, MessageCircle, Search, TrendingUp, ThumbsUp, ThumbsDown, Hash, Activity } from "lucide-react";

interface StatCard {
  labelKey: "insights.statSearches" | "insights.statResults" | "insights.statInteractions" | "insights.statFeedback" | "insights.statTraining";
  value: string | number;
  icon: React.ElementType;
}

const Insights = () => {
  const { t, i18n } = useTranslation();
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

    const totalSearches = searches.length;
    const totalResults = results.length;
    const totalInteractions = interactions.length;
    const totalFeedback = searchFb.length + resultFb.length;

    setStats([
      { labelKey: "insights.statSearches", value: totalSearches, icon: Search },
      { labelKey: "insights.statResults", value: totalResults, icon: BarChart3 },
      { labelKey: "insights.statInteractions", value: totalInteractions, icon: Activity },
      { labelKey: "insights.statFeedback", value: totalFeedback, icon: MessageCircle },
      { labelKey: "insights.statTraining", value: training.length, icon: TrendingUp },
    ]);

    const themeCounts: Record<string, number> = {};
    searches.forEach((s) => {
      const themes = s.interpreted_themes;
      if (Array.isArray(themes)) {
        (themes as string[]).forEach((th) => {
          themeCounts[th] = (themeCounts[th] || 0) + 1;
        });
      }
    });
    setTopThemes(
      Object.entries(themeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([theme, count]) => ({ theme, count }))
    );

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

    const intCounts: Record<string, number> = {};
    interactions.forEach((it) => {
      intCounts[it.interaction_type] = (intCounts[it.interaction_type] || 0) + 1;
    });
    setTopInteractions(
      Object.entries(intCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => ({ type, count }))
    );

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
      <div className="relative max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-10 pb-24 md:pb-10 overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-artwork-radial opacity-25" aria-hidden />
        <div className="relative mb-12">
          <p className="text-xs text-muted-foreground font-body uppercase tracking-wider mb-2">{t("insights.internal")}</p>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">{t("insights.title")}</h1>
          <p className="text-muted-foreground font-body text-sm max-w-xl">{t("insights.subtitle")}</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="surface-card rounded-3xl p-6 animate-pulse-soft h-24 border border-border/40" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-12">
              {stats.map((s) => (
                <div key={s.labelKey} className="surface-card rounded-2xl p-4 md:p-5 text-center border border-border/50 shadow-soft">
                  <s.icon className="w-4 h-4 text-primary mx-auto mb-2" />
                  <p className="font-display text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground font-body mt-0.5">{t(s.labelKey)}</p>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-6 md:gap-8 mb-12">
              <div className="surface-card rounded-3xl p-6 md:p-7 border border-border/50">
                <div className="flex items-center gap-2 mb-4">
                  <Hash className="w-4 h-4 text-primary" />
                  <h3 className="font-display text-base font-semibold">{t("insights.topThemes")}</h3>
                </div>
                {topThemes.length === 0 ? (
                  <p className="text-sm text-muted-foreground font-body">{t("insights.noData")}</p>
                ) : (
                  <div className="space-y-2">
                    {topThemes.map((row) => (
                      <div key={row.theme} className="flex items-center gap-3">
                        <span className="text-sm font-body text-foreground w-28 truncate">{row.theme}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary/70 to-emotional-tag/50 transition-all"
                            style={{ width: `${(row.count / maxThemeCount) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground font-body w-6 text-right">{row.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="surface-card rounded-3xl p-6 md:p-7 border border-border/50">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-4 h-4 text-primary" />
                  <h3 className="font-display text-base font-semibold">{t("insights.interactionTypes")}</h3>
                </div>
                {topInteractions.length === 0 ? (
                  <p className="text-sm text-muted-foreground font-body">{t("insights.noData")}</p>
                ) : (
                  <div className="space-y-2">
                    {topInteractions.map((row) => (
                      <div key={row.type} className="flex items-center gap-3">
                        <span className="text-sm font-body text-foreground w-32 truncate">{row.type.replace(/_/g, " ")}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent/60 rounded-full transition-all"
                            style={{ width: `${(row.count / maxInteractionCount) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground font-body w-6 text-right">{row.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="surface-card rounded-3xl p-6 md:p-7 mb-12 border border-border/50">
              <div className="flex items-center gap-2 mb-4">
                <MessageCircle className="w-4 h-4 text-primary" />
                <h3 className="font-display text-base font-semibold">{t("insights.feedbackBreakdown")}</h3>
              </div>
              {feedbackBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground font-body">{t("insights.noFeedback")}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {feedbackBreakdown.map((f) => {
                    const isPositive = ["good match", "better than expected", "good results", "good"].includes(f.label);
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

            <div className="surface-card rounded-3xl p-6 md:p-7 border border-border/50">
              <div className="flex items-center gap-2 mb-4">
                <Search className="w-4 h-4 text-primary" />
                <h3 className="font-display text-base font-semibold">{t("insights.recentSearches")}</h3>
              </div>
              {recentSearches.length === 0 ? (
                <p className="text-sm text-muted-foreground font-body">{t("insights.noSearches")}</p>
              ) : (
                <div className="space-y-3">
                  {recentSearches.map((s, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-4 py-2 border-b border-border/30 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-body text-foreground truncate">&quot;{s.prompt}&quot;</p>
                        <p className="text-xs text-muted-foreground font-body mt-0.5">{s.mood}</p>
                      </div>
                      <p className="text-xs text-muted-foreground font-body shrink-0">
                        {new Date(s.created_at).toLocaleDateString(i18n.language, { month: "short", day: "numeric" })}
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
