import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ThumbsUp, ThumbsDown, MessageCircle, X, Check } from "lucide-react";
import { trackResultFeedback } from "@/services/tracking";

/** Valori inviati al backend (inglese, stabili). Chiavi sotto `resultFb.*` nei JSON. */
const NEGATIVE_OPTIONS: { value: string; labelKey: string }[] = [
  { value: "not quite right", labelKey: "neg_not_quite" },
  { value: "too generic", labelKey: "neg_too_generic" },
  { value: "too sad", labelKey: "neg_too_sad" },
  { value: "too intense", labelKey: "neg_too_intense" },
  { value: "wrong theme", labelKey: "neg_wrong_theme" },
];

interface ResultFeedbackProps {
  searchResultId: string;
  searchId: string;
}

const ResultFeedback = ({ searchResultId, searchId }: ResultFeedbackProps) => {
  const { t } = useTranslation();
  const [state, setState] = useState<"idle" | "positive" | "negative" | "text" | "done">("idle");
  const [textInput, setTextInput] = useState("");


  const submit = async (label: string, text?: string) => {
    await trackResultFeedback({ searchResultId, searchId, label, text });
    setState("done");
  };

  if (state === "done") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-primary/70 font-body animate-fade-in">
        <Check className="w-3 h-3" />
        {t("resultFb.thanks")}
      </div>
    );
  }

  if (state === "idle") {
    return (
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => submit("good match")}
          className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          title={t("resultFb.titleGood")}
        >
          <ThumbsUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setState("negative")}
          className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          title={t("resultFb.titleBad")}
        >
          <ThumbsDown className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  if (state === "negative") {
    return (
      <div className="flex flex-wrap gap-1 items-center animate-fade-in">
        {NEGATIVE_OPTIONS.map(({ value, labelKey }) => (
          <button
            key={value}
            type="button"
            onClick={() => submit(value)}
            className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all font-body"
          >
            {t(`resultFb.${labelKey}`)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setState("text")}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
          title={t("resultFb.titleWrite")}
        >
          <MessageCircle className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setState("idle")}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
        >
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
        placeholder={t("resultFb.placeholder")}
        className="text-xs bg-muted/50 border border-border rounded-lg px-3 py-1.5 text-foreground placeholder:text-muted-foreground font-body outline-none focus:border-primary/30 w-48"
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
        {t("resultFb.send")}
      </button>
      <button type="button" onClick={() => setState("negative")} className="p-1 text-muted-foreground hover:text-foreground">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default ResultFeedback;
