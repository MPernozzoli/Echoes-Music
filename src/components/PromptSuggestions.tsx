import { Sparkles } from "lucide-react";

interface PromptSuggestionsProps {
  suggestions: string[];
  onSelect: (prompt: string) => void;
}

const PromptSuggestions = ({ suggestions, onSelect }: PromptSuggestionsProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.map((suggestion, i) => (
        <button
          key={suggestion}
          onClick={() => onSelect(suggestion)}
          className="group flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-2xl border border-border/60 bg-card/50 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/[0.08] hover:shadow-md transition-all duration-300 font-body animate-fade-slide-up hover:-rotate-1 hover:scale-[1.02] motion-reduce:hover:rotate-0 motion-reduce:hover:scale-100"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <Sparkles className="w-3 h-3 text-primary/50 group-hover:text-primary transition-colors shrink-0" />
          {suggestion}
        </button>
      ))}
    </div>
  );
};

export default PromptSuggestions;
