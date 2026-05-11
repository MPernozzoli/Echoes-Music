import { useState, useCallback } from "react";

export type ChatDesign = "legacy" | "new";

const DESIGN_KEY = "echoes_chat_design";

export function useChatDesignPreference() {
  const [design, setDesignState] = useState<ChatDesign>(() => {
    try {
      const stored = localStorage.getItem(DESIGN_KEY);
      return stored === "legacy" ? "legacy" : "new";
    } catch {
      return "new";
    }
  });

  const setDesign = useCallback((d: ChatDesign) => {
    setDesignState(d);
    try {
      localStorage.setItem(DESIGN_KEY, d);
    } catch {
      // ignore
    }
  }, []);

  return { design, setDesign };
}
