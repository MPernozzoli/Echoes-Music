/* @refresh skip */
import { createContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { linkUserSettingsToAccount } from "@/services/tracking";
import { linkSpotifyConnectionToUser } from "@/services/spotify";
import type { User, Session } from "@supabase/supabase-js";

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  tokenBalance: number | null;
  plan: string;
  signOut: () => Promise<void>;
  refreshTokenBalance: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [plan, setPlan] = useState("free");

  const refreshTokenBalance = useCallback(async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    if (!s?.user) { setTokenBalance(null); return; }
    const { data } = await supabase
      .from("user_tokens")
      .select("balance")
      .eq("user_id", s.user.id)
      .maybeSingle();
    setTokenBalance(data?.balance ?? null);
  }, []);

  const refreshPlan = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("user_subscriptions")
      .select("plan, status")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    setPlan(data?.plan ?? "free");
  }, []);

  useEffect(() => {
    const linkAccountData = (userId: string) => {
      void linkUserSettingsToAccount(userId);
      void linkSpotifyConnectionToUser(userId);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
        if (newSession?.user) {
          if (event === "SIGNED_IN") linkAccountData(newSession.user.id);
          setTimeout(() => {
            refreshTokenBalance();
            refreshPlan(newSession.user.id);
          }, 0);
        } else {
          setTokenBalance(null);
          setPlan("free");
        }
      }
    );
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
      if (s?.user) {
        linkAccountData(s.user.id);
        refreshTokenBalance();
        refreshPlan(s.user.id);
      }
    });
    return () => subscription.unsubscribe();
  }, [refreshTokenBalance, refreshPlan]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, tokenBalance, plan, signOut, refreshTokenBalance }}>
      {children}
    </AuthContext.Provider>
  );
};
