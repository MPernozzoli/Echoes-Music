import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowUp, ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { resizeImageForSearch } from "@/lib/resizeImageForSearch";
import type { MusicSearchMode } from "@/services/musicSearchApi";

export type PromptSubmitPayload = {
  text: string;
  imageBase64?: string;
  imageMimeType?: string;
  mode?: Extract<MusicSearchMode, "search" | "creator_trends">;
};

interface PromptInputProps {
  onSubmit: (payload: PromptSubmitPayload) => void;
  placeholder?: string;
  creatorPlaceholder?: string;
  size?: "default" | "hero" | "compact";
  isLoading?: boolean;
  allowImageAttachment?: boolean;
  allowModeSwitch?: boolean;
  initialMode?: Extract<MusicSearchMode, "search" | "creator_trends">;
}

const PromptInput = ({
  onSubmit,
  placeholder,
  creatorPlaceholder,
  size = "default",
  isLoading = false,
  allowImageAttachment = false,
  allowModeSwitch = false,
  initialMode = "search",
}: PromptInputProps) => {
  const { t } = useTranslation();
  const [value, setValue] = useState("");
  const [image, setImage] = useState<{ dataUrl: string; base64: string; mimeType: string } | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [mode, setMode] = useState<Extract<MusicSearchMode, "search" | "creator_trends">>(initialMode);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = value.trim();
    if ((!t && !image) || isLoading || imageBusy) return;
    onSubmit({
      text: value,
      mode,
      ...(image ? { imageBase64: image.base64, imageMimeType: image.mimeType } : {}),
    });
    setValue("");
    setImage(null);
  };

  const handleModeChange = (nextMode: Extract<MusicSearchMode, "search" | "creator_trends">) => {
    setMode(nextMode);
    if (nextMode === "creator_trends") {
      setImage(null);
    }
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !f.type.startsWith("image/")) return;
    setImageBusy(true);
    try {
      const out = await resizeImageForSearch(f);
      setImage({ dataUrl: out.dataUrl, base64: out.base64, mimeType: out.mimeType });
    } catch {
      setImage(null);
    } finally {
      setImageBusy(false);
    }
  };

  const isHero = size === "hero";
  const isCompact = size === "compact";
  const canSend = (value.trim().length > 0 || !!image) && !isLoading && !imageBusy;
  const imagesEnabled = allowImageAttachment && mode === "search";
  const activePlaceholder =
    mode === "creator_trends"
      ? creatorPlaceholder || t("promptInput.creatorPlaceholder")
      : placeholder || t("promptInput.placeholderDefault");

  return (
    <form onSubmit={handleSubmit} className="w-full">
      {allowModeSwitch && (
        <div className="mb-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleModeChange("search")}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors",
              mode === "search"
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border/60 bg-background/80 text-muted-foreground hover:text-foreground"
            )}
          >
            {t("promptInput.modeSearch")}
          </button>
          <button
            type="button"
            onClick={() => handleModeChange("creator_trends")}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors",
              mode === "creator_trends"
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border/60 bg-background/80 text-muted-foreground hover:text-foreground"
            )}
          >
            {t("promptInput.modeCreator")}
          </button>
        </div>
      )}
      {allowImageAttachment && image && (
        <div className="mb-2 flex items-center gap-2.5 animate-fade-slide-up">
          <div className="relative inline-block rounded-xl overflow-hidden border border-primary/20 ring-1 ring-primary/10 shadow-sm">
            <img src={image.dataUrl} alt="" className="h-14 w-auto max-w-[100px] object-cover" />
            <button
              type="button"
              onClick={() => setImage(null)}
              className="absolute -top-0.5 -right-0.5 rounded-full bg-background/95 p-0.5 shadow-md border border-border/70 hover:bg-destructive hover:text-destructive-foreground transition-colors"
              aria-label={t("promptInput.removeImage")}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <span className="text-[11px] text-muted-foreground/80 font-body leading-snug">
            {t("promptInput.imageHint")}
          </span>
        </div>
      )}
      <div
        className={cn(
          "relative group transition-all duration-300 rounded-2xl",
          isHero && "input-glow glass-card shadow-lg shadow-primary/[0.06]",
          isHero && isLoading && "ring-2 ring-primary/25 animate-glow-pulse motion-reduce:animate-none",
          !isHero && !isCompact && "input-glow rounded-2xl bg-card/80 border border-border/80 shadow-sm",
          isCompact &&
            "rounded-2xl border border-border/60 bg-card/60 shadow-[0_1px_3px_rgba(0,0,0,0.08)] backdrop-blur-xl transition-shadow focus-within:shadow-[0_0_0_1px_hsl(var(--ring)/0.35),0_2px_12px_hsl(var(--ring)/0.08)] focus-within:border-primary/30",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2",
            isHero && "px-5 py-4",
            !isHero && !isCompact && "px-5 py-4",
            isCompact && "px-3 py-2 sm:px-4 sm:py-2.5"
          )}
        >
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={activePlaceholder}
            className={cn(
              "flex-1 min-w-0 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/60 font-body",
              isHero && "text-lg",
              !isHero && !isCompact && "text-base",
              isCompact && "text-sm sm:text-[15px]"
            )}
            disabled={isLoading || imageBusy}
          />
          {imagesEnabled && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPickFile}
              />
              <button
                type="button"
                disabled={isLoading || imageBusy}
                onClick={() => fileRef.current?.click()}
                className={cn(
                  "shrink-0 rounded-xl text-muted-foreground/60 hover:text-primary transition-colors disabled:opacity-30",
                  isCompact ? "p-1.5" : "p-2"
                )}
                aria-label={t("promptInput.attachImage")}
              >
                {imageBusy ? (
                  <div
                    className={cn(
                      "border-2 border-primary/30 border-t-primary rounded-full animate-spin",
                      isCompact ? "w-4 h-4" : "w-5 h-5"
                    )}
                  />
                ) : (
                  <ImagePlus className={cn(isCompact ? "w-4 h-4" : "w-5 h-5")} />
                )}
              </button>
            </>
          )}
          <button
            type="submit"
            disabled={!canSend}
            className={cn(
              "shrink-0 rounded-xl bg-primary text-primary-foreground transition-all disabled:opacity-20 disabled:scale-95",
              canSend && "hover:brightness-110 active:scale-95 shadow-sm shadow-primary/20",
              isCompact ? "p-1.5 sm:p-2" : "p-2.5"
            )}
          >
            {isLoading ? (
              <div
                className={cn(
                  "border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin",
                  isCompact ? "w-4 h-4" : "w-5 h-5"
                )}
              />
            ) : (
              <ArrowUp className={cn(isCompact ? "w-4 h-4" : "w-5 h-5")} strokeWidth={2.5} />
            )}
          </button>
        </div>
      </div>
    </form>
  );
};

export default PromptInput;
