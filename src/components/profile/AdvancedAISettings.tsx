import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  getByoAiSettings,
  postByoAiSettings,
  type ByoAiSettingsStatus,
} from "@/services/byoAiSettingsApi";

type DraftMode = "managed" | "byo";

function statusLabel(server: ByoAiSettingsStatus): { text: string; tone: "ok" | "warn" | "neutral" } {
  if (server.ai_provider_mode === "managed") {
    return { text: "Managed AI active", tone: "neutral" };
  }
  if (server.byo_key_status === "valid") {
    return { text: "Custom API key active", tone: "ok" };
  }
  return { text: "Custom API key needs attention", tone: "warn" };
}

export function AdvancedAISettings() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [server, setServer] = useState<ByoAiSettingsStatus | null>(null);
  const [draftMode, setDraftMode] = useState<DraftMode>("managed");
  const [disclaimerChecked, setDisclaimerChecked] = useState(false);
  const [replaceKey, setReplaceKey] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testState, setTestState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [modeSaving, setModeSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoadError(null);
    const s = await getByoAiSettings();
    setServer(s);
    setDraftMode(s.ai_provider_mode === "byo_key" ? "byo" : "managed");
    return s;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await refresh();
        if (!cancelled && s) {
          setDraftMode(s.ai_provider_mode === "byo_key" ? "byo" : "managed");
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : "Could not load advanced AI settings.";
          setLoadError(msg);
          toast.error(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const resetDraftToServer = useCallback(() => {
    if (!server) return;
    setDraftMode(server.ai_provider_mode === "byo_key" ? "byo" : "managed");
    setDisclaimerChecked(false);
    setReplaceKey(false);
    setApiKeyInput("");
    setTestState("idle");
    setTestMessage(null);
    setShowKey(false);
  }, [server]);

  const handleCancel = () => {
    resetDraftToServer();
  };

  const handleTestConnection = async (useInputKey: boolean) => {
    setTestState("loading");
    setTestMessage(null);
    try {
      if (useInputKey) {
        if (!apiKeyInput.trim()) {
          setTestState("error");
          setTestMessage("Enter an API key to test.");
          return;
        }
        const res = (await postByoAiSettings({
          action: "test",
          apiKey: apiKeyInput.trim(),
        })) as { ok?: boolean; message?: string };
        if (res.ok) {
          setTestState("success");
          setTestMessage("Connection successful.");
        } else {
          setTestState("error");
          setTestMessage(typeof res.message === "string" ? res.message : "Connection failed.");
        }
      } else {
        const res = (await postByoAiSettings({ action: "test_saved" })) as {
          ok?: boolean;
          message?: string;
        };
        if (res.ok) {
          setTestState("success");
          setTestMessage("Saved key verified successfully.");
        } else {
          setTestState("error");
          setTestMessage(typeof res.message === "string" ? res.message : "Test failed.");
        }
      }
      void refresh();
    } catch (e) {
      setTestState("error");
      setTestMessage(e instanceof Error ? e.message : "Connection failed.");
    }
  };

  const handleSaveAndEnable = async () => {
    if (!disclaimerChecked || !apiKeyInput.trim()) return;
    setSaving(true);
    try {
      await postByoAiSettings({
        action: "save",
        apiKey: apiKeyInput.trim(),
        disclaimerAccepted: true,
      });
      toast.success("Custom AI enabled. Your key is stored securely.");
      setApiKeyInput("");
      setDisclaimerChecked(false);
      setReplaceKey(false);
      setTestState("idle");
      setTestMessage(null);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save key.");
    } finally {
      setSaving(false);
    }
  };

  const applyMode = async (mode: "managed" | "byo_key") => {
    setModeSaving(true);
    try {
      await postByoAiSettings({ action: "set_mode", mode });
      toast.success(mode === "managed" ? "Using Echoes managed AI." : "Custom API key mode enabled.");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update mode.");
    } finally {
      setModeSaving(false);
    }
  };

  const handleSwitchToManaged = async () => {
    setModeSaving(true);
    try {
      await postByoAiSettings({ action: "clear" });
      toast.success("Restored Echoes managed AI and removed your stored key.");
      setDraftMode("managed");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not switch back.");
    } finally {
      setModeSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6 mb-6 flex items-center gap-3 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin shrink-0" />
        <span className="text-sm font-body">Loading advanced settings…</span>
      </div>
    );
  }

  if (!server) {
    if (loadError) {
      return (
        <div className="glass-card rounded-2xl p-6 mb-6 border border-destructive/20">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-500/90 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h3 className="font-body text-sm font-medium text-foreground">Advanced AI Settings</h3>
              <p className="text-xs text-muted-foreground font-body mt-2 leading-relaxed">
                Impossibile caricare questa sezione. Di solito dipende da una di queste cose: non sei loggato con sessione valida, la Edge
                Function <code className="text-[10px] px-1 rounded bg-muted">byo-ai-settings</code> non è ancora deployata su Supabase, o
                manca il secret <code className="text-[10px] px-1 rounded bg-muted">BYO_AI_ENCRYPTION_KEY</code> (vedi punto 2 sotto).
              </p>
              <p className="text-xs text-destructive/90 font-mono mt-2 break-all">{loadError}</p>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setLoadError(null);
                  void refresh()
                    .catch((err) => {
                      setLoadError(err instanceof Error ? err.message : "Retry failed");
                      toast.error(err instanceof Error ? err.message : "Retry failed");
                    })
                    .finally(() => setLoading(false));
                }}
                className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-body border border-border hover:border-primary/30"
              >
                Riprova
              </button>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }

  const badge = statusLabel(server);
  const showByoFlow = draftMode === "byo";
  const afterDisclaimer = disclaimerChecked;
  const showKeyForm = afterDisclaimer && (replaceKey || !server.has_stored_key);
  const showSavedKeyActions = afterDisclaimer && server.has_stored_key && !replaceKey;
  const saveDisabled = !disclaimerChecked || !apiKeyInput.trim() || saving;

  return (
    <div className="glass-card rounded-2xl p-6 mb-6 border border-border/60">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-amber-500/90" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-body text-sm font-medium text-foreground tracking-tight">Advanced AI Settings</h3>
          <p className="text-xs text-muted-foreground font-body mt-1 leading-relaxed">
            Use Echoes with our managed AI service, or connect your own API key if you want more control and understand the tradeoffs.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`text-[11px] font-body px-2 py-0.5 rounded-full border ${
                badge.tone === "ok"
                  ? "border-emerald-500/35 text-emerald-400/90 bg-emerald-500/5"
                  : badge.tone === "warn"
                    ? "border-amber-500/35 text-amber-400/90 bg-amber-500/5"
                    : "border-border text-muted-foreground bg-muted/30"
              }`}
            >
              {badge.text}
            </span>
            {server.byo_api_key_masked && (
              <span className="text-[11px] font-mono text-muted-foreground">{server.byo_api_key_masked}</span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <label className="flex items-start gap-3 rounded-xl border border-border/80 bg-background/40 p-3 cursor-pointer hover:border-primary/25 transition-colors">
          <input
            type="radio"
            name="ai-mode"
            className="mt-1"
            checked={draftMode === "managed"}
            onChange={() => {
              setDraftMode("managed");
              setDisclaimerChecked(false);
              setReplaceKey(false);
              setApiKeyInput("");
              setTestState("idle");
              setTestMessage(null);
            }}
          />
          <div>
            <p className="text-sm font-body text-foreground">Use Echoes AI (recommended)</p>
            <p className="text-[11px] text-muted-foreground font-body mt-0.5">
              Best consistency, quality, and support — the default Echoes experience.
            </p>
          </div>
        </label>
        <label className="flex items-start gap-3 rounded-xl border border-border/80 bg-background/40 p-3 cursor-pointer hover:border-primary/25 transition-colors">
          <input
            type="radio"
            name="ai-mode"
            className="mt-1"
            checked={draftMode === "byo"}
            onChange={() => setDraftMode("byo")}
          />
          <div>
            <p className="text-sm font-body text-foreground">Use my own AI API key (advanced)</p>
            <p className="text-[11px] text-muted-foreground font-body mt-0.5">
              OpenAI API keys only for now. You carry cost, limits, and configuration risk.
            </p>
          </div>
        </label>
      </div>

      {draftMode === "managed" && server.ai_provider_mode === "byo_key" && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            disabled={modeSaving}
            onClick={() => void applyMode("managed")}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-body border border-border hover:border-primary/30 disabled:opacity-50"
          >
            {modeSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Use managed AI only (keep key on file)
          </button>
          <button
            type="button"
            disabled={modeSaving}
            onClick={() => void handleSwitchToManaged()}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-body border border-destructive/25 text-destructive/80 hover:bg-destructive/10 disabled:opacity-50"
          >
            Remove key &amp; use Echoes AI
          </button>
        </div>
      )}

      {draftMode === "managed" && server.ai_provider_mode === "managed" && server.has_stored_key && (
        <button
          type="button"
          disabled={modeSaving}
          onClick={() => void handleSwitchToManaged()}
          className="text-xs font-body text-muted-foreground hover:text-destructive/90 underline-offset-2 hover:underline mb-4 block"
        >
          Delete saved API key
        </button>
      )}

      {showByoFlow && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4 mb-4">
          <div className="flex gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-500/90 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground font-body">Use your own API key at your own responsibility</p>
              <p className="text-xs text-muted-foreground font-body mt-2 leading-relaxed">
                This is an advanced feature for technical users. When you use your own API key, Echoes cannot guarantee the same quality,
                reliability, speed, or feature consistency as the default managed experience. You are responsible for billing, quota limits,
                provider restrictions, and configuration issues tied to your own API account. Some features may behave differently or stop
                working if your key is invalid, restricted, or out of credit. Echoes support is limited for problems caused by your API
                configuration. Continue only if you understand these tradeoffs.
              </p>
            </div>
          </div>
          <label className="flex items-start gap-2 mt-4 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 rounded border-border"
              checked={disclaimerChecked}
              onChange={(e) => {
                setDisclaimerChecked(e.target.checked);
                if (!e.target.checked) {
                  setTestState("idle");
                  setTestMessage(null);
                  setReplaceKey(false);
                }
              }}
            />
            <span className="text-xs text-foreground/90 font-body leading-snug">
              I understand the risks and limitations of using my own API key.
            </span>
          </label>
        </div>
      )}

      {showByoFlow && showSavedKeyActions && (
        <div className="space-y-4 mb-4">
          <p className="text-xs text-muted-foreground font-body">
            You have a key on file ({server.byo_api_key_masked ?? "saved"}). Test it, enable custom mode, or replace it.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={testState === "loading"}
              onClick={() => void handleTestConnection(false)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-body border border-border hover:border-primary/30 disabled:opacity-50"
            >
              {testState === "loading" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Test connection
            </button>
            <button
              type="button"
              disabled={modeSaving}
              onClick={() => void applyMode("byo_key")}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-body bg-primary/90 text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {modeSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Save and enable
            </button>
            <button
              type="button"
              onClick={() => {
                setReplaceKey(true);
                setTestState("idle");
                setTestMessage(null);
              }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-body border border-border text-muted-foreground hover:text-foreground"
            >
              Replace API key
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleCancel}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-body border border-border text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showByoFlow && showKeyForm && (
        <div className="space-y-4">
          <div>
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-body">OpenAI API key</label>
            <div className="relative mt-1">
              <input
                type={showKey ? "text" : "password"}
                autoComplete="off"
                spellCheck={false}
                value={apiKeyInput}
                onChange={(e) => {
                  setApiKeyInput(e.target.value);
                  setTestState("idle");
                  setTestMessage(null);
                }}
                placeholder="sk-…"
                className="w-full rounded-lg bg-muted/50 border border-border px-3 py-2 pr-10 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                aria-label={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground font-body mt-1.5">
              The full key is never shown again after saving. Stored encrypted on our servers.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!apiKeyInput.trim() || testState === "loading"}
              onClick={() => void handleTestConnection(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-body border border-border hover:border-primary/30 disabled:opacity-50"
            >
              {testState === "loading" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Test connection
            </button>
            {server.has_stored_key && replaceKey && (
              <button
                type="button"
                disabled={testState === "loading"}
                onClick={() => void handleTestConnection(false)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-body border border-border/70 hover:border-primary/30 disabled:opacity-50"
              >
                Test saved key
              </button>
            )}
          </div>

          {testMessage && (
            <div
              className={`flex items-start gap-2 text-xs font-body rounded-lg px-3 py-2 ${
                testState === "success"
                  ? "bg-emerald-500/10 text-emerald-200/90 border border-emerald-500/20"
                  : testState === "error"
                    ? "bg-destructive/10 text-destructive/90 border border-destructive/20"
                    : "bg-muted/40 text-muted-foreground"
              }`}
            >
              {testState === "success" ? <Check className="w-4 h-4 shrink-0 mt-0.5" /> : null}
              {testState === "error" ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> : null}
              <span>{testMessage}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={saveDisabled}
              onClick={() => void handleSaveAndEnable()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-body bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save and enable
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                if (replaceKey && server.has_stored_key) {
                  setReplaceKey(false);
                  setApiKeyInput("");
                  setTestState("idle");
                  setTestMessage(null);
                } else handleCancel();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-body border border-border text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
