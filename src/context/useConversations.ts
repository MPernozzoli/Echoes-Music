import { useContext } from "react";
import { ConversationContext } from "@/context/ConversationContext";

export const useConversations = () => {
  const ctx = useContext(ConversationContext);
  if (!ctx) throw new Error("useConversations must be used within ConversationProvider");
  return ctx;
};
