/* @refresh skip */
import {
  createContext,
  useCallback,
  useMemo,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAuth } from "@/context/useAuth";
import type { SearchResult } from "@/data/mockData";
import type { Conversation, ChatMessage, ConversationMemory, UserTasteProfile } from "@/types/conversation";
import { applyConversationMemoryUpdate, loadUserTasteProfile, mergeUserTasteProfile } from "@/lib/memoryMerge";
import { deleteUserConversation, fetchUserConversations, syncUserConversations } from "@/services/conversationSync";

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
    .map((c) => {
      const messages = Array.isArray(c.messages) ? c.messages : [];
      const hasAssistantResult = messages.some((m) => m?.role === "assistant");
      return {
        ...c,
        messages,
        conversationProfile: hasAssistantResult ? c.conversationProfile ?? null : null,
        conversationMemory: hasAssistantResult ? c.conversationMemory ?? null : null,
        title: typeof c.title === "string" ? c.title : "Chat",
      };
    });
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

function isEmptyDraftConversation(conversation: Conversation): boolean {
  return (
    conversation.messages.length === 0 &&
    (conversation.title === "Nuova chat" || conversation.title === "Chat")
  );
}

function mergeLocalAndRemoteConversations(local: Conversation[], remote: Conversation[]): Conversation[] {
  const remoteHasContent = remote.length > 0;
  const byId = new Map<string, Conversation>();

  for (const conversation of remote) {
    byId.set(conversation.id, conversation);
  }

  for (const conversation of local) {
    if (remoteHasContent && !byId.has(conversation.id) && isEmptyDraftConversation(conversation)) {
      continue;
    }

    const existing = byId.get(conversation.id);
    if (!existing) {
      byId.set(conversation.id, conversation);
      continue;
    }

    const localUpdated = new Date(conversation.updatedAt).getTime();
    const remoteUpdated = new Date(existing.updatedAt).getTime();
    if (localUpdated > remoteUpdated) {
      byId.set(conversation.id, conversation);
    }
  }

  return [...byId.values()]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 80);
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
  refreshConversations: () => Promise<void>;
  getConversation: (id: string | null) => Conversation | undefined;
}

export const ConversationContext = createContext<ConversationState | null>(null);

export const ConversationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const initialConvState = useMemo(() => getInitialConversationState(), []);
  const [conversations, setConversations] = useState<Conversation[]>(() => initialConvState.conversations);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => initialConvState.activeId);
  const [userTasteProfile, setUserTasteProfile] = useState<UserTasteProfile>(() =>
    loadUserTasteProfile(loadJSON(USER_TASTE_KEY, null))
  );
  const [remoteSyncReady, setRemoteSyncReady] = useState(false);
  const latestConversationsRef = useRef(conversations);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    latestConversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    if (user) return;
    setRemoteSyncReady(false);
    setConversations((prev) => {
      if (prev.length <= 1) return prev;
      const sorted = [...prev].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      const keep = sorted[0];
      queueMicrotask(() => setActiveConversationId(keep.id));
      return [keep];
    });
  }, [user, conversations.length]);

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

  const refreshConversations = useCallback(async () => {
    const userId = user?.id;
    if (!userId) {
      setRemoteSyncReady(false);
      return;
    }

    setRemoteSyncReady(false);

    try {
      const remoteConversations = await fetchUserConversations(userId);
      const merged = mergeLocalAndRemoteConversations(latestConversationsRef.current, remoteConversations);
      setConversations(merged);
      setActiveConversationId((current) => {
        if (current && merged.some((conversation) => conversation.id === current)) return current;
        return merged[0]?.id ?? null;
      });
      setRemoteSyncReady(true);
    } catch (error) {
      console.error("Unable to load synced conversations:", error);
      toast.error("Impossibile sincronizzare le chat da questo dispositivo.");
    }
  }, [user?.id]);

  useEffect(() => {
    void refreshConversations();
  }, [refreshConversations]);

  useEffect(() => {
    const userId = user?.id;
    if (!userId || !remoteSyncReady) return;

    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      syncUserConversations(userId, latestConversationsRef.current).catch((error) => {
        console.error("Unable to sync conversations:", error);
        toast.error("Impossibile salvare le chat sul cloud.");
      });
    }, 600);

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [user?.id, remoteSyncReady, conversations]);

  const createConversation = useCallback((): string => {
    if (!user && conversations.length >= 1) {
      toast.message(t("anon.loginForNewChat"));
      window.location.assign("/auth");
      return activeConversationId ?? conversations[0]?.id ?? "";
    }
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
  }, [user, conversations, activeConversationId, t]);

  const selectConversation = useCallback((id: string | null) => {
    setActiveConversationId(id);
  }, []);

  const deleteConversation = useCallback(
    (id: string) => {
      if (!user && conversations.length <= 1) {
        toast.message(t("anon.cannotDeleteOnlyChat"));
        return;
      }
      if (user) {
        deleteUserConversation(user.id, id).catch((error) => {
          console.error("Unable to delete synced conversation:", error);
          toast.error("Impossibile eliminare la chat dal cloud.");
        });
      }
      setConversations((prev) => prev.filter((c) => c.id !== id));
      setActiveConversationId((cur) => (cur === id ? null : cur));
    },
    [user, conversations.length, t]
  );

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
      refreshConversations,
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
      refreshConversations,
      getConversation,
    ]
  );

  return <ConversationContext.Provider value={value}>{children}</ConversationContext.Provider>;
};
