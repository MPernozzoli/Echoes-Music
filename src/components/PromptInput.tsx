import { useState } from "react";
import { Search, Sparkles } from "lucide-react";

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  placeholder?: string;
  size?: "default" | "hero";
  isLoading?: boolean;
}

const PromptInput = ({ onSubmit, placeholder, size = "default", isLoading = false }: PromptInputProps) => {
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !isLoading) {
      onSubmit(value.trim());
    }
  };

  const isHero = size === "hero";

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className={`
        relative group input-glow rounded-2xl transition-all duration-300
        ${isHero ? "glass-card" : "bg-card border border-border"}
      `}>
        <div className="flex items-center gap-3 px-5 py-4">
          <Sparkles className={`shrink-0 text-primary ${isHero ? "w-6 h-6" : "w-5 h-5"}`} />
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder || "Describe a feeling, a memory, or a moment..."}
            className={`
              flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground font-body
              ${isHero ? "text-lg" : "text-base"}
            `}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!value.trim() || isLoading}
            className="shrink-0 p-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-30"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </form>
  );
};

export default PromptInput;
