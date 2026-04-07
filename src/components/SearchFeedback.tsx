import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageCircle, Check, X } from "lucide-react";
import { trackSearchFeedback } from "@/services/tracking";

const FEEDBACK_IDS = ["good", "not_quite", "generic", "wrong_mood", "better"] as const;

interface SearchFeedbackProps {
  searchId: string;
}

const SearchFeedback = ({ searchId }: SearchFeedbackProps) => {
  const { t } = useTranslation();
  const [state, setState] = useState<"idle" | "open" | "text" | "done">("idle");
  const [textInput, setTextInput] = useState("");

  const labels = useMemo(
    () =>
      FEEDBACK_IDS.map((id) => ({
        id,
        label: t(`searchFeedback.${id}` as const),
      })),
    [t]
  );

  const submit = async (label: string, text?: string) => {
    await trackSearchFeedback({ searchId, label, text });
    setState("done");
  };

  if (state === "done") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-primary/70 font-body animate-fade-in">
        <Check className="w-3.5 h-3.5" />
        {t("searchFeedback.done")}
      </div>
    );
  }

  if (state === "idle") {
    return (
      <button
        type="button"
        onClick={() => setState("open")}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-body transition-colors"
      >
        <MessageCircle className="w-3.5 h-3.5" />
        {t("searchFeedback.prompt")}
      </button>
    );
  }

  if (state === "open") {
    return (
      <div className="flex flex-wrap gap-1.5 items-center animate-fade-in">
        {labels.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => submit(id)}
            className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all font-body"
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setState("text")}
          className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all font-body"
        >
          {t("searchFeedback.other")}
        </button>
        <button type="button" onClick={() => setState("idle")} className="p-1 text-muted-foreground hover:text-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2 items-center animate-fade-in">
      <input
        type="text"
        value={textInput}
        onChange={(e) => setTextInput(e.target.value)}
        placeholder={t("searchFeedback.placeholder")}
        className="text-xs bg-muted/50 border border-border rounded-lg px-3 py-1.5 text-foreground placeholder:text-muted-foreground font-body outline-none focus:border-primary/30 w-56"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && textInput.trim()) submit("custom", textInput.trim());
        }}
      />
      <button
        type="button"
        onClick={() => {
          if (textInput.trim()) submit("custom", textInput.trim());
        }}
        disabled={!textInput.trim()}
        className="text-xs px-2 py-1 rounded-lg bg-primary text-primary-foreground font-body disabled:opacity-30"
      >
        {t("searchFeedback.send")}
      </button>
      <button type="button" onClick={() => setState("open")} className="p-1 text-muted-foreground hover:text-foreground">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default SearchFeedback;
