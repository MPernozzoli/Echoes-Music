import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";
import { animate, stagger } from "animejs";

interface PromptSuggestionsProps {
  suggestions: string[];
  onSelect: (prompt: string) => void;
}

const PromptSuggestions = ({ suggestions, onSelect }: PromptSuggestionsProps) => {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const root = rootRef.current;
    if (!root) return;
    const items = root.querySelectorAll<HTMLElement>("[data-prompt-suggestion]");
    if (items.length === 0) return;
    items.forEach((el) => {
      el.style.opacity = "0";
    });
    const anim = animate(items, {
      opacity: [0, 1],
      translateY: [12, 0],
      scale: [0.96, 1],
      duration: 650,
      delay: stagger(45, { start: 80 }),
      ease: "outQuart",
    });
    return () => anim.pause?.();
  }, [suggestions]);

  return (
    <div ref={rootRef} className="flex flex-wrap gap-2">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion}
          data-prompt-suggestion
          onClick={() => onSelect(suggestion)}
          className="group flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-2xl border border-border/60 bg-card/50 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/[0.08] hover:shadow-md transition-all duration-300 font-body hover:-rotate-1 hover:scale-[1.02] motion-reduce:hover:rotate-0 motion-reduce:hover:scale-100"
        >
          <Sparkles className="w-3 h-3 text-primary/50 group-hover:text-primary transition-colors shrink-0" />
          {suggestion}
        </button>
      ))}
    </div>
  );
};

export default PromptSuggestions;
