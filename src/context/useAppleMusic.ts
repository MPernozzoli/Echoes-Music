import { useContext } from "react";
import { AppleMusicContext } from "@/context/appleMusicContextObject";

export const useAppleMusic = () => {
  const ctx = useContext(AppleMusicContext);
  if (!ctx) throw new Error("useAppleMusic must be used within AppleMusicProvider");
  return ctx;
};
