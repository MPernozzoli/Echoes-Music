import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/useAuth";
import { PENDING_REFERRAL_STORAGE_KEY, REFERRAL_QUERY_PARAM } from "@/constants/referralStorage";

/** Salva ?ref= nel localStorage per applicarlo dopo il login. */
export function ReferralQueryCapture() {
  const { search } = useLocation();
  useEffect(() => {
    const p = new URLSearchParams(search);
    const code = p.get(REFERRAL_QUERY_PARAM)?.trim();
    if (code) {
      try {
        localStorage.setItem(PENDING_REFERRAL_STORAGE_KEY, code);
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
  const storageCheckedForUser = useRef<string | null>(null);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) {
      storageCheckedForUser.current = null;
      return;
    }
    if (storageCheckedForUser.current === userId) return;
    storageCheckedForUser.current = userId;

    let trimmed: string | null = null;
    try {
      trimmed = localStorage.getItem(PENDING_REFERRAL_STORAGE_KEY)?.trim() ?? null;
    } catch {
      return;
    }
    if (!trimmed) return;

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
  }, [session?.user?.id, refreshTokenBalance, t]);

  return null;
}
