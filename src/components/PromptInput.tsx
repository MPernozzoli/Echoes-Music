import { useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  placeholder?: string;
  size?: "default" | "hero" | "compact";
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
  const isCompact = size === "compact";

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div
        className={cn(
          "relative group transition-all duration-300",
          isHero && "input-glow rounded-2xl glass-card",
          !isHero && !isCompact && "input-glow rounded-2xl bg-card border border-border",
          isCompact && "rounded-2xl border border-border/80 bg-background/90 shadow-sm shadow-black/5 dark:shadow-none backdrop-blur-md"
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2 sm:gap-3",
            isHero && "px-5 py-4",
            !isHero && !isCompact && "px-5 py-4",
            isCompact && "px-3 py-2.5 sm:px-4 sm:py-3"
          )}
        >
          <Sparkles
            className={cn(
              "shrink-0 text-primary",
              isHero && "w-6 h-6",
              !isHero && !isCompact && "w-5 h-5",
              isCompact && "w-4 h-4 sm:w-5 sm:h-5"
            )}
          />
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder || "Describe a feeling, a memory, or a moment..."}
            className={cn(
              "flex-1 min-w-0 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground font-body",
              isHero && "text-lg",
              !isHero && !isCompact && "text-base",
              isCompact && "text-sm sm:text-base"
            )}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!value.trim() || isLoading}
            className={cn(
              "shrink-0 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-30",
              isCompact ? "p-2 sm:p-2.5" : "p-2.5"
            )}
          >
            {isLoading ? (
              <div
                className={cn(
                  "border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin",
                  isCompact ? "w-4 h-4 sm:w-5 sm:h-5" : "w-5 h-5"
                )}
              />
            ) : (
              <Search className={cn(isCompact ? "w-4 h-4 sm:w-5 sm:h-5" : "w-5 h-5")} />
            )}
          </button>
        </div>
      </div>
    </form>
  );
};

export default PromptInput;
