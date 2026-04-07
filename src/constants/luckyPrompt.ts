/** Valori possibili del prompt “surprise me” (allineati alle stringhe i18n `chat.surpriseMe`). */
export const LUCKY_SEARCH_PROMPTS = [
  "Sorprendimi",
  "Surprise me",
  "Surprenez-moi",
  "Überrasche mich",
  "Sorpréndeme",
  "Surpreenda-me",
] as const;

export function isLuckyPrompt(prompt: string): boolean {
  const p = prompt.trim();
  return (LUCKY_SEARCH_PROMPTS as readonly string[]).includes(p);
}
