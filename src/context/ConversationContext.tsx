/* @refresh skip */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type { SearchResult } from "@/data/mockData";
import type { Conversation, ChatMessage, ConversationMemory, UserTasteProfile } from "@/types/conversation";
import { applyConversationMemoryUpdate, loadUserTasteProfile, mergeUserTasteProfile } from "@/lib/memoryMerge";
import { emotionalProfileToAxes } from "@/types/conversation";

const CONVERSATIONS_KEY = "echoes_conversations";
const ACTIVE_CONV_KEY = "echoes_active_conversation_id";
const USER_TASTE_KEY = "echoes_user_taste_profile";

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function parseConversations(raw: unknown): Conversation[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c): c is Conversation => c && typeof c === "object" && typeof (c as Conversation).id === "string")
    .map((c) => ({
      ...c,
      messages: Array.isArray(c.messages) ? c.messages : [],
      conversationProfile: c.conversationProfile ?? null,
      conversationMemory: c.conversationMemory ?? null,
      title: typeof c.title === "string" ? c.title : "Chat",
    }));
}

function getInitialConversationState(): { conversations: Conversation[]; activeId: string } {
  const parsed = parseConversations(loadJSON(CONVERSATIONS_KEY, []));
  if (parsed.length > 0) {
    const saved = localStorage.getItem(ACTIVE_CONV_KEY);
    const active =
      saved && parsed.some((c) => c.id === saved) ? saved : parsed[0].id;
    return { conversations: parsed, activeId: active };
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  return {
    conversations: [
      {
        id,
        title: "Nuova chat",
        updatedAt: now,
        messages: [],
        conversationProfile: null,
        conversationMemory: null,
      },
    ],
    activeId: id,
  };
}

interface ConversationState {
  conversations: Conversation[];
  activeConversationId: string | null;
  userTasteProfile: UserTasteProfile;
  createConversation: () => string;
  selectConversation: (id: string | null) => void;
  deleteConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;
  appendUserMessage: (
    conversationId: string,
    text: string,
    meta?: { imagePreviewUrl?: string }
  ) => void;
  appendAssistantResult: (conversationId: string, result: SearchResult) => void;
  patchSearchResultTracking: (
    conversationId: string,
    searchResultId: string,
    tracking: NonNullable<SearchResult["tracking"]>
  ) => void;
  setConversationMemory: (conversationId: string, memory: ConversationMemory | null) => void;
  mergeConversationMemoryFromUpdate: (
    conversationId: string,
    update: Parameters<typeof applyConversationMemoryUpdate>[1]
  ) => void;
  mergeUserTasteFromUpdate: (update: Parameters<typeof mergeUserTasteProfile>[1]) => void;
  getConversation: (id: string | null) => Conversation | undefined;
}

const ConversationContext = createContext<ConversationState | null>(null);

export const ConversationProvider = ({ children }: { children: ReactNode }) => {
  const initialConvState = useMemo(() => getInitialConversationState(), []);
  const [conversations, setConversations] = useState<Conversation[]>(() => initialConvState.conversations);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => initialConvState.activeId);
  const [userTasteProfile, setUserTasteProfile] = useState<UserTasteProfile>(() =>
    loadUserTasteProfile(loadJSON(USER_TASTE_KEY, null))
  );

  useEffect(() => {
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    if (activeConversationId) localStorage.setItem(ACTIVE_CONV_KEY, activeConversationId);
    else localStorage.removeItem(ACTIVE_CONV_KEY);
  }, [activeConversationId]);

  useEffect(() => {
    localStorage.setItem(USER_TASTE_KEY, JSON.stringify(userTasteProfile));
  }, [userTasteProfile]);

  const createConversation = useCallback((): string => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const conv: Conversation = {
      id,
      title: "Nuova chat",
      updatedAt: now,
      messages: [],
      conversationProfile: null,
      conversationMemory: null,
    };
    setConversations((prev) => [conv, ...prev].slice(0, 80));
    setActiveConversationId(id);
    return id;
  }, []);

  const selectConversation = useCallback((id: string | null) => {
    setActiveConversationId(id);
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    setActiveConversationId((cur) => (cur === id ? null : cur));
  }, []);

  const renameConversation = useCallback((id: string, title: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: title.slice(0, 80) } : c))
    );
  }, []);

  const appendUserMessage = useCallback(
    (conversationId: string, text: string, meta?: { imagePreviewUrl?: string }) => {
      const msg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        text,
        timestamp: new Date().toISOString(),
        ...(meta?.imagePreviewUrl ? { imagePreviewUrl: meta.imagePreviewUrl } : {}),
      };
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== conversationId) return c;
          const titleSeed = text.trim() || (meta?.imagePreviewUrl ? "Foto" : "Messaggio");
          const title =
            c.messages.length === 0
              ? titleSeed.slice(0, 48) + (titleSeed.length > 48 ? "…" : "")
              : c.title;
          return {
            ...c,
            title,
            updatedAt: msg.timestamp,
            messages: [...c.messages, msg],
          };
        })
      );
    },
    []
  );

  const appendAssistantResult = useCallback((conversationId: string, result: SearchResult) => {
    const msg: ChatMessage = {
      id: `a-${result.id}`,
      role: "assistant",
      timestamp: result.timestamp,
      searchResult: result,
    };
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== conversationId) return c;
        return {
          ...c,
          conversationProfile: result.emotionalProfile,
          updatedAt: result.timestamp,
          messages: [...c.messages, msg],
        };
      })
    );
  }, []);

  const patchSearchResultTracking = useCallback(
    (conversationId: string, searchResultId: string, tracking: NonNullable<SearchResult["tracking"]>) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== conversationId) return c;
          return {
            ...c,
            messages: c.messages.map((m) => {
              if (m.role !== "assistant" || m.searchResult.id !== searchResultId) return m;
              return {
                ...m,
                searchResult: { ...m.searchResult, tracking },
              };
            }),
          };
        })
      );
    },
    []
  );

  const setConversationMemory = useCallback((conversationId: string, memory: ConversationMemory | null) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, conversationMemory: memory } : c))
    );
  }, []);

  const mergeConversationMemoryFromUpdate = useCallback(
    (conversationId: string, update: Parameters<typeof applyConversationMemoryUpdate>[1]) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== conversationId) return c;
          const next = applyConversationMemoryUpdate(c.conversationMemory, update);
          return { ...c, conversationMemory: next };
        })
      );
    },
    []
  );

  const mergeUserTasteFromUpdate = useCallback((update: Parameters<typeof mergeUserTasteProfile>[1]) => {
    setUserTasteProfile((prev) => mergeUserTasteProfile(prev, update));
  }, []);

  const getConversation = useCallback(
    (id: string | null) => (id ? conversations.find((c) => c.id === id) : undefined),
    [conversations]
  );

  const value = useMemo(
    () => ({
      conversations,
      activeConversationId,
      userTasteProfile,
      createConversation,
      selectConversation,
      deleteConversation,
      renameConversation,
      appendUserMessage,
      appendAssistantResult,
      patchSearchResultTracking,
      setConversationMemory,
      mergeConversationMemoryFromUpdate,
      mergeUserTasteFromUpdate,
      getConversation,
    }),
    [
      conversations,
      activeConversationId,
      userTasteProfile,
      createConversation,
      selectConversation,
      deleteConversation,
      renameConversation,
      appendUserMessage,
      appendAssistantResult,
      patchSearchResultTracking,
      setConversationMemory,
      mergeConversationMemoryFromUpdate,
      mergeUserTasteFromUpdate,
      getConversation,
    ]
  );

  return <ConversationContext.Provider value={value}>{children}</ConversationContext.Provider>;
};

export const useConversations = () => {
  const ctx = useContext(ConversationContext);
  if (!ctx) throw new Error("useConversations must be used within ConversationProvider");
  return ctx;
};

/** Bootstrap memory from first emotional profile if missing */
export function memoryOrFromProfile(
  memory: ConversationMemory | null,
  profile: SearchResult["emotionalProfile"] | null
): ConversationMemory | null {
  if (memory?.threadSummary) return memory;
  if (!profile) return memory;
  return {
    threadSummary: profile.mood.slice(0, 200),
    standardAxes: emotionalProfileToAxes(profile),
    turnCount: memory?.turnCount ?? 0,
    lastUpdatedAt: memory?.lastUpdatedAt,
  };
}
