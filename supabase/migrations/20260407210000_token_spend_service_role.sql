-- Edge functions (service_role) devono poter chiamare spend_token / grant_tokens.
GRANT EXECUTE ON FUNCTION public.spend_token(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_tokens(uuid, integer, text, text) TO service_role;

-- Utenti senza riga user_tokens (es. creati prima dei trigger): stesso saldo iniziale degli altri.
INSERT INTO public.user_tokens (user_id, balance, lifetime_earned, lifetime_spent)
SELECT u.id, 30, 30, 0
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_tokens t WHERE t.user_id = u.id);
