import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/useAuth";
import { PENDING_REFERRAL_STORAGE_KEY, REFERRAL_QUERY_PARAM } from "@/constants/referralStorage";

export const REFERRAL_STORAGE_UPDATED_EVENT = "echoes-referral-updated";

/** Salva ?ref= nel localStorage per applicarlo dopo il login. */
export function ReferralQueryCapture() {
  const { search } = useLocation();
  useEffect(() => {
    const p = new URLSearchParams(search);
    const code = p.get(REFERRAL_QUERY_PARAM)?.trim();
    if (code) {
      try {
        localStorage.setItem(PENDING_REFERRAL_STORAGE_KEY, code);
        window.dispatchEvent(new Event(REFERRAL_STORAGE_UPDATED_EVENT));
      } catch {
        /* ignore */
      }
    }
  }, [search]);
  return null;
}

type ClaimResult = { ok?: boolean; error?: string };

const terminalErrors = new Set([
  "invalid_code",
  "self",
  "already_referred",
  "already_claimed",
  "empty",
]);

/** Dopo login: una sola lettura del codice pendente per sessione utente. */
export function ReferralClaimOnLogin() {
  const { session, refreshTokenBalance } = useAuth();
  const { t } = useTranslation();
  const { pathname, search } = useLocation();
  const storageCheckedForUser = useRef<string | null>(null);
  const [storageVersion, setStorageVersion] = useState(0);

  useEffect(() => {
    const handleReferralStorageUpdated = () => setStorageVersion((value) => value + 1);
    window.addEventListener(REFERRAL_STORAGE_UPDATED_EVENT, handleReferralStorageUpdated);
    window.addEventListener("storage", handleReferralStorageUpdated);
    return () => {
      window.removeEventListener(REFERRAL_STORAGE_UPDATED_EVENT, handleReferralStorageUpdated);
      window.removeEventListener("storage", handleReferralStorageUpdated);
    };
  }, []);

  const pendingCode = useMemo(() => {
    try {
      return localStorage.getItem(PENDING_REFERRAL_STORAGE_KEY)?.trim() ?? "";
    } catch {
      return "";
    }
  }, [pathname, search, storageVersion]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) {
      storageCheckedForUser.current = null;
      return;
    }
    const trimmed = pendingCode || null;
    if (!trimmed) return;
    const claimAttemptKey = `${userId}:${trimmed}`;
    if (storageCheckedForUser.current === claimAttemptKey) return;
    storageCheckedForUser.current = claimAttemptKey;

    void (async () => {
      const { data, error } = await supabase.rpc("claim_referral", { p_code: trimmed });
      if (error) {
        return;
      }
      const res = data as ClaimResult;
      if (res?.ok) {
        try {
          localStorage.removeItem(PENDING_REFERRAL_STORAGE_KEY);
        } catch {
          /* ignore */
        }
        toast.success(t("referral.claimSuccess"));
        void refreshTokenBalance();
        return;
      }
      if (res?.error && terminalErrors.has(res.error)) {
        try {
          localStorage.removeItem(PENDING_REFERRAL_STORAGE_KEY);
        } catch {
          /* ignore */
        }
      }
    })();
  }, [pendingCode, refreshTokenBalance, session?.user?.id, t]);

  return null;
}
