interface PromptSuggestionsProps {
  suggestions: string[];
  onSelect: (prompt: string) => void;
}

const PromptSuggestions = ({ suggestions, onSelect }: PromptSuggestionsProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion}
          onClick={() => onSelect(suggestion)}
          className="text-sm px-4 py-2 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all duration-300 font-body"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
};

export default PromptSuggestions;
