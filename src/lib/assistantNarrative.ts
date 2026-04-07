import type { EmotionalProfile } from "@/data/mockData";

export function fallbackNarrativeForResult(
  prompt: string,
  profile: EmotionalProfile,
  opts: { lucky?: boolean; songCount: number }
): string {
  const mood = profile.mood.trim();
  const themeHint = profile.themes.length ? profile.themes.slice(0, 3).join(", ") : "";
  const moodClip = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n)}…`);

  if (opts.lucky) {
    return [
      `Ho messo insieme ${opts.songCount} brani come piccola "radiografia" del tuo gusto: un punto di partenza più centrale e qualche scoperta nello stesso quartiere emotivo.`,
      themeHint ? ` Temi che ricorrono: ${themeHint}.` : "",
      ` Il filo: ${moodClip(mood, 240)}`,
      ` I titoli sono qui sotto: apri ognuno per la scheda con la spiegazione sul singolo brano e i comandi per ascoltare o mettere in coda.`,
    ].join("");
  }

  return [
    `Ho cercato di tradurre «${prompt}» in un arco musicale coerente.`,
    ` L'impasto emotivo: ${moodClip(mood, 260)}`,
    themeHint ? ` Temi: ${themeHint}.` : "",
    ` Scorri i brani qui sotto — in ogni titolo trovi perché quel pezzo c'entra e cosa puoi farci.`,
  ].join("");
}
