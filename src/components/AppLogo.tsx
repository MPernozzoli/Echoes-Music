import { useTheme } from "next-themes";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

const LOGO = { light: "/logo-light.png", dark: "/logo-dark.png" } as const;

function useLogoSrc(): string {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === "light" ? LOGO.light : LOGO.dark;
}

export function ThemeFaviconSync() {
  const src = useLogoSrc();
  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon'][data-echoes]");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      link.type = "image/png";
      link.setAttribute("data-echoes", "1");
      document.head.appendChild(link);
    }
    link.href = src;
  }, [src]);
  return null;
}

type AppLogoProps = {
  className?: string;
  /** Lato del quadrato in px */
  size?: number;
};

export function AppLogo({ className, size = 28 }: AppLogoProps) {
  const src = useLogoSrc();
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={cn("object-contain shrink-0", className)}
      decoding="async"
    />
  );
}
