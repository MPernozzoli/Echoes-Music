/** Errori MusicKit / rete che spesso indicano JWT dev scaduto o sessione utente Apple non più valida. */
export function isAppleMusicSessionOrTokenError(err: unknown): boolean {
  if (err == null) return false;
  const raw =
    err instanceof Error
      ? `${err.name} ${err.message}`
      : typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string"
        ? String((err as { message: string }).message)
        : String(err);
  const s = raw.toLowerCase();
  if (s.includes("401")) return true;
  if (s.includes("unauthorized")) return true;
  if (s.includes("invalid_grant")) return true;
  if (s.includes("access_denied")) return true;
  if (s.includes("forbidden") && (s.includes("token") || s.includes("developer"))) return true;
  if (s.includes("musicusertoken") || s.includes("music user token")) return true;
  if (s.includes("developertoken") || s.includes("developer token")) return true;
  if (s.includes("not authorized") || s.includes("notauthorized")) return true;
  if (s.includes("token_expired")) return true;
  return false;
}
