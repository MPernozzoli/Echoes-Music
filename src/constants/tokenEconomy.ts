/** Allineare a `handle_new_user_tokens` e agli accrediti Stripe (edge `stripe-webhook`). */
export const SIGNUP_TOKEN_BONUS = 30;
/** Token inclusi a ogni ciclo di fatturazione abbonamento (mensile). */
export const PREMIUM_TOKENS_PER_MONTHLY_CYCLE = 120;
/** Token inclusi a ogni fattura annuale (12 mesi × mensile). */
export const PREMIUM_TOKENS_PER_ANNUAL_CYCLE = 1440;

/** Bonus per referrer e invitato alla registrazione con codice valido (SQL `claim_referral`). */
export const REFERRAL_SIGNUP_BONUS_EACH = 30;
/** Quota extra alla prima attivazione Pro dell’invitato: frazione del grant del ciclo (webhook + `try_grant_referral_pro_bonus`). */
export const REFERRAL_PRO_BONUS_RATE = 0.5;
