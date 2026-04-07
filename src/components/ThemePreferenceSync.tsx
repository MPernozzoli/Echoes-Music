import { useEffect } from "react";
import { useTheme } from "next-themes";
import { useAuth } from "@/context/useAuth";
import { getUserSettings } from "@/services/tracking";

const THEME_VALUES = new Set(["light", "dark", "system"]);

/** All'avvio / dopo login applica il tema salvato sul profilo utente (se presente). */
export function ThemePreferenceSync() {
  const { user } = useAuth();
  const { setTheme } = useTheme();

  useEffect(() => {
    if (!user) return;
    void getUserSettings().then((s) => {
      const t = s?.theme;
      if (t && THEME_VALUES.has(t)) setTheme(t);
    });
  }, [user?.id, setTheme]);

  return null;
}
