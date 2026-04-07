import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAuth } from "@/context/useAuth";

/** Gestisce ?checkout=success|cancelled dopo il ritorno da Stripe su qualsiasi pagina. */
const CheckoutReturnHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { refreshTokenBalance, user, loading } = useAuth();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;
    const params = new URLSearchParams(location.search);
    const checkout = params.get("checkout");
    if (!checkout) return;

    if (!user) {
      params.delete("checkout");
      params.delete("plan");
      const qs = params.toString();
      navigate(`${location.pathname}${qs ? `?${qs}` : ""}`, { replace: true });
      return;
    }

    const key = `${location.pathname}${location.search}`;
    if (handled.current === key) return;
    handled.current = key;

    if (checkout === "success") {
      toast.success(t("pricing.checkoutSuccess"));
      void refreshTokenBalance();
    } else if (checkout === "cancelled") {
      toast.message(t("pricing.checkoutCancelled"));
    }

    params.delete("checkout");
    params.delete("plan");
    const qs = params.toString();
    navigate(`${location.pathname}${qs ? `?${qs}` : ""}`, { replace: true });
  }, [loading, location.pathname, location.search, navigate, refreshTokenBalance, t, user]);

  return null;
};

export default CheckoutReturnHandler;
