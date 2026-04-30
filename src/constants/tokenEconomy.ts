/** Allineare a `handle_new_user_tokens` e agli accrediti Stripe (edge `stripe-webhook`). */
export const SIGNUP_TOKEN_BONUS = 30;
/** Gli abbonati PRO non consumano token app mentre l’abbonamento è attivo. */
export const PRO_HAS_UNLIMITED_TOKENS = true;

/** Bonus per referrer e invitato alla registrazione con codice valido (SQL `claim_referral`). */
export const REFERRAL_SIGNUP_BONUS_EACH = 30;
