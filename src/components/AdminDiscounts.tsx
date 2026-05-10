import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, X, Tag, Copy, RefreshCw, Megaphone, Wand2, Save } from "lucide-react";
import {
  fetchAdminHomepageDiscountPromotions,
  generatePromotionTranslations,
  normalizePromotionMessages,
  PROMOTION_LANGS,
  saveHomepageDiscountPromotion,
  type HomepageDiscountPromotion,
  type PromotionMessages,
} from "@/services/homepageDiscountPromotion";
import type { SupportedUiLang } from "@/i18n/config";

// Returns Unix timestamp for 23:59:59 on dateStr in Europe/Rome (handles CET/CEST)
function toRomeEndOfDay(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const noonUTC = new Date(Date.UTC(y, m - 1, d, 12));
  const romeHour = parseInt(
    new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Rome", hour: "numeric", hour12: false }).format(noonUTC),
    10,
  );
  const romeOffset = romeHour - 12; // e.g. 1 for CET, 2 for CEST
  return Math.floor(Date.UTC(y, m - 1, d, 23 - romeOffset, 59, 59) / 1000);
}

const PRODUCT_IDS = {
  monthly: "prod_UQtOkhToUuJFAA",
  annual: "prod_UQtOvEkrSURxiY",
};

type PromoCode = {
  id: string;
  code: string;
  active: boolean;
  times_redeemed: number;
  max_redemptions: number | null;
  expires_at: number | null;
  first_time_only: boolean;
};

type Coupon = {
  coupon_id: string;
  name: string;
  percent_off: number | null;
  amount_off: number | null;
  currency: string | null;
  duration: string;
  duration_in_months: number | null;
  applies_to: { products: string[] } | null;
  valid: boolean;
  times_redeemed: number;
  promotion_codes: PromoCode[];
};

type PromoCodeWithCoupon = PromoCode & { coupon: Coupon };

type PromotionFormState = {
  promotionCodeId: string;
  code: string;
  active: boolean;
  startsAt: string;
  endsAt: string;
  messages: PromotionMessages;
  firstTimeOnly: boolean;
  appliesToProducts: string[];
};

async function callCouponsApi(body: object) {
  const { data, error } = await supabase.functions.invoke("stripe-admin-coupons", { body });
  if (error) throw error;
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as { data?: Coupon[]; coupon_id?: string; promotion_code_id?: string; code?: string };
}

function formatDiscount(c: Coupon) {
  if (c.percent_off != null) return `${c.percent_off}%`;
  if (c.amount_off != null) return `€${(c.amount_off / 100).toFixed(2)}`;
  return "—";
}

function formatDuration(c: Coupon) {
  if (c.duration === "once") return "Solo primo addebito";
  if (c.duration === "forever") return "Per sempre";
  if (c.duration === "repeating" && c.duration_in_months) return `Per ${c.duration_in_months} mesi`;
  return c.duration;
}

function appliesToLabel(c: Coupon) {
  const ids = c.applies_to?.products ?? [];
  if (!ids.length) return "Tutti i prodotti";
  if (ids.includes(PRODUCT_IDS.monthly) && ids.includes(PRODUCT_IDS.annual)) return "Abbonamenti";
  if (ids.includes(PRODUCT_IDS.monthly)) return "Solo mensile";
  if (ids.includes(PRODUCT_IDS.annual)) return "Solo annuale";
  return "Prodotti specifici";
}

function toDatetimeLocal(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localDatetimeToIso(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

const LANGUAGE_LABELS: Record<SupportedUiLang, string> = {
  it: "Italiano",
  en: "English",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
  pt: "Português",
};

const APPLIES_TO_OPTIONS = [
  { value: "all", label: "Tutti i prodotti" },
  { value: "subscriptions", label: "Solo abbonamenti" },
  { value: "monthly", label: "Solo Piano Mensile" },
  { value: "annual", label: "Solo Piano Annuale" },
] as const;

type AppliesToKey = (typeof APPLIES_TO_OPTIONS)[number]["value"];

function getProductIds(appliesTo: AppliesToKey): string[] {
  if (appliesTo === "monthly") return [PRODUCT_IDS.monthly];
  if (appliesTo === "annual") return [PRODUCT_IDS.annual];
  if (appliesTo === "subscriptions") return [PRODUCT_IDS.monthly, PRODUCT_IDS.annual];
  return [];
}

const AdminDiscounts = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [promotions, setPromotions] = useState<HomepageDiscountPromotion[]>([]);
  const [promotionForm, setPromotionForm] = useState<PromotionFormState | null>(null);
  const [savingPromotion, setSavingPromotion] = useState(false);
  const [translatingPromotion, setTranslatingPromotion] = useState(false);
  const [sourceLanguage, setSourceLanguage] = useState<SupportedUiLang>("it");

  const [code, setCode] = useState("");
  const [couponName, setCouponName] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "amount">("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [duration, setDuration] = useState<"once" | "repeating" | "forever">("once");
  const [durationMonths, setDurationMonths] = useState("");
  const [appliesTo, setAppliesTo] = useState<AppliesToKey>("all");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [firstTimeOnly, setFirstTimeOnly] = useState(false);

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const [result, homepagePromotions] = await Promise.all([
        callCouponsApi({ action: "list" }),
        fetchAdminHomepageDiscountPromotions(),
      ]);
      setCoupons(result.data ?? []);
      setPromotions(homepagePromotions);
    } catch (e) {
      toast.error("Errore caricamento sconti", { description: e instanceof Error ? e.message : String(e) });
    }
    setLoading(false);
  }, []);

  useEffect(() => { void loadCoupons(); }, [loadCoupons]);

  const resetForm = () => {
    setCode(""); setCouponName(""); setDiscountType("percent");
    setDiscountValue(""); setDuration("once"); setDurationMonths("");
    setAppliesTo("all"); setMaxRedemptions(""); setExpiryDate("");
    setFirstTimeOnly(false);
  };

  const handleCreate = async () => {
    if (!code.trim()) return toast.error("Inserisci il codice sconto");
    const value = parseFloat(discountValue);
    if (!discountValue || isNaN(value) || value <= 0) return toast.error("Inserisci un valore sconto valido");
    if (discountType === "percent" && value > 100) return toast.error("La percentuale non può superare 100");
    if (duration === "repeating" && (!durationMonths || parseInt(durationMonths) < 1))
      return toast.error("Inserisci il numero di mesi");

    setCreating(true);
    try {
      const result = await callCouponsApi({
        action: "create",
        code: code.trim(),
        coupon_name: couponName.trim() || code.trim(),
        discount_type: discountType,
        discount_value: discountType === "percent" ? value : Math.round(value * 100),
        duration,
        ...(duration === "repeating" ? { duration_in_months: parseInt(durationMonths) } : {}),
        applies_to: getProductIds(appliesTo),
        ...(maxRedemptions && parseInt(maxRedemptions) > 0 ? { max_redemptions: parseInt(maxRedemptions) } : {}),
        ...(expiryDate ? { redeem_by: toRomeEndOfDay(expiryDate) } : {}),
        first_time_only: firstTimeOnly,
      });
      toast.success(`Codice "${result.code}" creato con successo`);
      setShowForm(false);
      resetForm();
      await loadCoupons();
    } catch (e) {
      toast.error("Errore creazione", { description: e instanceof Error ? e.message : String(e) });
    }
    setCreating(false);
  };

  const handleDeactivate = async (promoCodeId: string, codeStr: string) => {
    setDeactivatingId(promoCodeId);
    try {
      await callCouponsApi({ action: "deactivate", promotion_code_id: promoCodeId });
      toast.success(`Codice "${codeStr}" disattivato`);
      await loadCoupons();
    } catch (e) {
      toast.error("Errore", { description: e instanceof Error ? e.message : String(e) });
    }
    setDeactivatingId(null);
  };

  const allPromoCodes = coupons.flatMap((c) =>
    c.promotion_codes.map((p) => ({ ...p, coupon: c }))
  );

  const promotionByCodeId = new Map(promotions.map((promotion) => [promotion.promotion_code_id, promotion]));

  const openPromotionForm = (pc: PromoCodeWithCoupon) => {
    const existing = promotionByCodeId.get(pc.id);
    const messages = normalizePromotionMessages(existing?.messages);
    setPromotionForm({
      promotionCodeId: pc.id,
      code: pc.code,
      active: existing?.active ?? false,
      startsAt: toDatetimeLocal(existing?.starts_at),
      endsAt: toDatetimeLocal(existing?.ends_at),
      firstTimeOnly: existing?.first_time_only ?? pc.first_time_only,
      appliesToProducts: existing?.applies_to_products ?? pc.coupon.applies_to?.products ?? [],
      messages: Object.keys(messages).length > 0
        ? messages
        : { it: `Usa il codice ${pc.code} e risparmia su Echoes.` },
    });
  };

  const updatePromotionMessage = (lang: SupportedUiLang, value: string) => {
    setPromotionForm((current) => current
      ? { ...current, messages: { ...current.messages, [lang]: value } }
      : current);
  };

  const handleGenerateTranslations = async () => {
    if (!promotionForm) return;
    const sourceMessage = promotionForm.messages[sourceLanguage]?.trim();
    if (!sourceMessage) return toast.error(`Inserisci prima il testo in ${LANGUAGE_LABELS[sourceLanguage]}`);

    setTranslatingPromotion(true);
    try {
      const translations = await generatePromotionTranslations({
        sourceLanguage,
        message: sourceMessage,
        code: promotionForm.code,
      });
      setPromotionForm((current) => current
        ? { ...current, messages: { ...current.messages, ...translations, [sourceLanguage]: sourceMessage } }
        : current);
      toast.success("Traduzioni generate");
    } catch (e) {
      toast.error("Errore traduzioni IA", { description: e instanceof Error ? e.message : String(e) });
    }
    setTranslatingPromotion(false);
  };

  const handleSavePromotion = async () => {
    if (!promotionForm) return;
    if (promotionForm.active && !Object.values(promotionForm.messages).some((msg) => msg?.trim())) {
      return toast.error("Inserisci almeno una frase promozionale");
    }

    setSavingPromotion(true);
    try {
      await saveHomepageDiscountPromotion({
        promotionCodeId: promotionForm.promotionCodeId,
        code: promotionForm.code,
        active: promotionForm.active,
        startsAt: localDatetimeToIso(promotionForm.startsAt),
        endsAt: localDatetimeToIso(promotionForm.endsAt),
        messages: promotionForm.messages,
        firstTimeOnly: promotionForm.firstTimeOnly,
        appliesToProducts: promotionForm.appliesToProducts,
      });
      toast.success(promotionForm.active
        ? `Codice "${promotionForm.code}" promosso in homepage`
        : `Promozione homepage per "${promotionForm.code}" salvata`);
      setPromotionForm(null);
      await loadCoupons();
    } catch (e) {
      toast.error("Errore salvataggio promozione", { description: e instanceof Error ? e.message : String(e) });
    }
    setSavingPromotion(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-muted-foreground">
          I codici vengono inseriti dagli utenti nella schermata di pagamento Stripe.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadCoupons} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Aggiorna
          </Button>
          <Button size="sm" onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }}>
            <Plus className="w-4 h-4 mr-1" /> Nuovo codice
          </Button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-xl border border-borderSubtle bg-card/60 p-5 space-y-4">
          <h3 className="font-medium">Nuovo codice sconto</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>
                Codice <span className="text-muted-foreground text-xs font-normal">(cosa digita l'utente)</span>
              </Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                placeholder="es. PRIMOMESE"
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Nome interno <span className="text-muted-foreground text-xs font-normal">(facoltativo)</span>
              </Label>
              <Input
                value={couponName}
                onChange={(e) => setCouponName(e.target.value)}
                placeholder="es. Primo mese gratuito"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo sconto</Label>
              <Select value={discountType} onValueChange={(v) => setDiscountType(v as "percent" | "amount")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percentuale (%)</SelectItem>
                  <SelectItem value="amount">Importo fisso (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Valore sconto</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === "percent" ? "es. 100" : "es. 9.99"}
                  className="pr-8"
                  min="0"
                  step={discountType === "amount" ? "0.01" : "1"}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  {discountType === "percent" ? "%" : "€"}
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Applicabile a</Label>
              <Select value={appliesTo} onValueChange={(v) => setAppliesTo(v as AppliesToKey)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {APPLIES_TO_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Durata dello sconto</Label>
              <Select value={duration} onValueChange={(v) => setDuration(v as typeof duration)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">Solo primo addebito</SelectItem>
                  <SelectItem value="repeating">Per N mesi</SelectItem>
                  <SelectItem value="forever">Per sempre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {duration === "repeating" && (
              <div className="space-y-1.5">
                <Label>Numero di mesi</Label>
                <Input
                  type="number"
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(e.target.value)}
                  placeholder="es. 3"
                  min="1"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>
                Max utilizzi <span className="text-muted-foreground text-xs font-normal">(0 = illimitato)</span>
              </Label>
              <Input
                type="number"
                value={maxRedemptions}
                onChange={(e) => setMaxRedemptions(e.target.value)}
                placeholder="es. 100"
                min="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Scade il{" "}
                <span className="text-muted-foreground text-xs font-normal">
                  (fuso di Roma · 23:59:59 · facoltativo)
                </span>
              </Label>
              <Input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>

          <div className="flex items-start gap-2.5 pt-1 pb-1">
            <Checkbox
              id="first-time-only"
              checked={firstTimeOnly}
              onCheckedChange={(v) => setFirstTimeOnly(Boolean(v))}
              className="mt-0.5"
            />
            <div>
              <label htmlFor="first-time-only" className="text-sm font-medium cursor-pointer">
                Solo nuovi utenti
              </label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Stripe accetta il codice solo se il cliente non ha mai completato un pagamento prima.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={creating}>
              {creating
                ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                : <Tag className="w-4 h-4 mr-1.5" />}
              Crea codice
            </Button>
            <Button variant="ghost" onClick={() => { setShowForm(false); resetForm(); }}>
              Annulla
            </Button>
          </div>
        </div>
      )}

      {promotionForm && (
        <div className="rounded-xl border border-primary/25 bg-card/70 p-5 space-y-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-primary" />
                <h3 className="font-medium">Promozione homepage</h3>
                <Badge variant="outline" className="font-mono">{promotionForm.code}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Solo un codice può essere promosso in homepage: attivandolo, gli altri vengono disattivati.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setPromotionForm(null)}>
              <X className="w-4 h-4 mr-1" /> Chiudi
            </Button>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-borderSubtle bg-muted/20 p-3">
            <Switch
              id="homepage-promotion-active"
              checked={promotionForm.active}
              onCheckedChange={(checked) => setPromotionForm({ ...promotionForm, active: checked })}
            />
            <div>
              <Label htmlFor="homepage-promotion-active" className="cursor-pointer">Promuovi in homepage</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Il banner appare solo se il codice è attivo e dentro la finestra data/ora configurata.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Requisiti rilevati: {promotionForm.firstTimeOnly ? "solo prima transazione" : "nessun vincolo prima transazione"}
                {" · "}
                {promotionForm.appliesToProducts.length > 0 ? "prodotti specifici" : "tutti i prodotti"}.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Inizio promozione <span className="text-muted-foreground text-xs font-normal">(facoltativo)</span></Label>
              <Input
                type="datetime-local"
                value={promotionForm.startsAt}
                onChange={(e) => setPromotionForm({ ...promotionForm, startsAt: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fine promozione <span className="text-muted-foreground text-xs font-normal">(facoltativo)</span></Label>
              <Input
                type="datetime-local"
                value={promotionForm.endsAt}
                onChange={(e) => setPromotionForm({ ...promotionForm, endsAt: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <Label>Frase promozionale localizzata</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  La homepage usa la lingua dell’interfaccia, con fallback automatico.
                </p>
              </div>
              <div className="flex gap-2">
                <Select value={sourceLanguage} onValueChange={(v) => setSourceLanguage(v as SupportedUiLang)}>
                  <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROMOTION_LANGS.map((lang) => (
                      <SelectItem key={lang} value={lang}>{LANGUAGE_LABELS[lang]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleGenerateTranslations()}
                  disabled={translatingPromotion}
                >
                  {translatingPromotion
                    ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    : <Wand2 className="w-4 h-4 mr-1.5" />}
                  Traduci con IA
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PROMOTION_LANGS.map((lang) => (
                <div key={lang} className="space-y-1.5">
                  <Label>{LANGUAGE_LABELS[lang]}</Label>
                  <Textarea
                    value={promotionForm.messages[lang] ?? ""}
                    onChange={(e) => updatePromotionMessage(lang, e.target.value)}
                    placeholder={`Frase banner in ${LANGUAGE_LABELS[lang]}`}
                    maxLength={180}
                    className="min-h-[78px] resize-y"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => void handleSavePromotion()} disabled={savingPromotion}>
              {savingPromotion
                ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                : <Save className="w-4 h-4 mr-1.5" />}
              Salva promozione
            </Button>
            <Button variant="ghost" onClick={() => setPromotionForm(null)}>Annulla</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : allPromoCodes.length === 0 ? (
        <div className="rounded-xl border border-borderSubtle bg-card/40 py-20 text-center text-muted-foreground text-sm">
          Nessun codice sconto creato.
        </div>
      ) : (
        <div className="rounded-xl border border-borderSubtle overflow-hidden bg-card/40">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Codice</th>
                  <th className="text-left px-4 py-3">Sconto</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Durata</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Applicabile a</th>
                  <th className="text-left px-4 py-3">Usi</th>
                  <th className="text-right px-4 py-3">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {allPromoCodes.map(({ coupon, ...pc }) => (
                  <tr key={pc.id} className="border-t border-borderSubtle/60 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">{pc.code}</span>
                        <button
                          onClick={() => { navigator.clipboard.writeText(pc.code); toast.success("Codice copiato"); }}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title="Copia codice"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {!pc.active && (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">Disattivo</Badge>
                        )}
                        {promotionByCodeId.get(pc.id)?.active && (
                          <Badge className="text-[10px] bg-primary/15 text-primary hover:bg-primary/20">Homepage</Badge>
                        )}
                      </div>
                      {coupon.name && coupon.name !== pc.code && (
                        <div className="text-xs text-muted-foreground mt-0.5">{coupon.name}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold">{formatDiscount(coupon)}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-xs text-muted-foreground">
                      {formatDuration(coupon)}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">
                      {appliesToLabel(coupon)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {pc.times_redeemed}
                      {pc.max_redemptions != null ? ` / ${pc.max_redemptions}` : ""}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openPromotionForm({ ...pc, coupon })}
                        >
                          <Megaphone className="w-4 h-4 mr-1" /> Homepage
                        </Button>
                      {pc.active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deactivatingId === pc.id}
                          onClick={() => handleDeactivate(pc.id, pc.code)}
                        >
                          {deactivatingId === pc.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <><X className="w-4 h-4 mr-1" /> Disattiva</>}
                        </Button>
                      )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDiscounts;
