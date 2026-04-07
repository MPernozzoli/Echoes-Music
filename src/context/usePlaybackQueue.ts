import { useContext } from "react";
import { PlaybackQueueContext } from "@/context/PlaybackQueueContext";

export const usePlaybackQueue = () => {
  const ctx = useContext(PlaybackQueueContext);
  if (!ctx) throw new Error("usePlaybackQueue must be used within PlaybackQueueProvider");
  return ctx;
};
