import { useContext } from "react";
import { SpotifyContext } from "@/context/SpotifyContext";

export const useSpotify = () => {
  const ctx = useContext(SpotifyContext);
  if (!ctx) throw new Error("useSpotify must be used within SpotifyProvider");
  return ctx;
};
