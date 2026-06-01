import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { isSupported, type SupportedUiLang } from "@/i18n/config";

const STORAGE_KEY = "echoes-locale-redirected";

/**
 * On first visit to "/", detect the browser language and redirect to
 * the matching locale subpath (e.g. /en, /de, /fr). Italian stays on "/"
 * since the root is the canonical default for the .it domain audience.
 *
 * Skipped if:
 *  - already redirected once this session
 *  - user landed on a path other than "/" (explicit intent)
 *  - URL contains ?nl=1 (no-localize escape hatch)
 *  - browser language is Italian or unsupported
 */
export function useLocaleAutoRedirect() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname !== "/") return;
    if (new URLSearchParams(search).has("nl")) return;

    try {
      if (sessionStorage.getItem(STORAGE_KEY)) return;
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // sessionStorage unavailable — bail to avoid redirect loops.
      return;
    }

    const langs = (navigator.languages?.length ? navigator.languages : [navigator.language]) ?? [];
    for (const raw of langs) {
      const code = raw?.split("-")[0]?.toLowerCase();
      if (!code) continue;
      if (code === "it") return; // root already serves Italian audience
      if (isSupported(code)) {
        navigate(`/${code as SupportedUiLang}`, { replace: true });
        return;
      }
    }
  }, [pathname, search, navigate]);
}
