import { useState } from "react";
import { ThumbsUp, ThumbsDown, MessageCircle, X, Check } from "lucide-react";
import { trackResultFeedback } from "@/services/tracking";

const NEGATIVE_LABELS = [
  "not quite right",
  "too generic",
  "too sad",
  "too intense",
  "wrong theme",
];

const POSITIVE_LABELS = ["good match", "better than expected"];

interface ResultFeedbackProps {
  searchResultId: string;
  searchId: string;
}

const ResultFeedback = ({ searchResultId, searchId }: ResultFeedbackProps) => {
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
        Thanks
      </div>
    );
  }

  if (state === "idle") {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => submit("good match")}
          className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          title="Good match"
        >
          <ThumbsUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setState("negative")}
          className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          title="Not right"
        >
          <ThumbsDown className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  if (state === "negative") {
    return (
      <div className="flex flex-wrap gap-1 items-center animate-fade-in">
        {NEGATIVE_LABELS.map((label) => (
          <button
            key={label}
            onClick={() => submit(label)}
            className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all font-body"
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => setState("text")}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
          title="Write feedback"
        >
          <MessageCircle className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setState("idle")}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // text state
  return (
    <div className="flex gap-2 items-center animate-fade-in">
      <input
        type="text"
        value={textInput}
        onChange={(e) => setTextInput(e.target.value)}
        placeholder="What felt off?"
        className="text-xs bg-muted/50 border border-border rounded-lg px-3 py-1.5 text-foreground placeholder:text-muted-foreground font-body outline-none focus:border-primary/30 w-48"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && textInput.trim()) submit("custom", textInput.trim());
        }}
      />
      <button
        onClick={() => { if (textInput.trim()) submit("custom", textInput.trim()); }}
        disabled={!textInput.trim()}
        className="text-xs px-2 py-1 rounded-lg bg-primary text-primary-foreground font-body disabled:opacity-30"
      >
        Send
      </button>
      <button onClick={() => setState("negative")} className="p-1 text-muted-foreground hover:text-foreground">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default ResultFeedback;
