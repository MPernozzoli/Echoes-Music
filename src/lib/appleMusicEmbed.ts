/** Storefront ISO a due lettere per URL embed (allineato al catalogo search US di default). */
export function appleMusicStorefront(): string {
  if (typeof navigator === "undefined") return "us";
  const lang = navigator.language?.toLowerCase() ?? "en-us";
  if (lang.startsWith("it")) return "it";
  const m = /^[a-z]{2}-([a-z]{2})$/i.exec(lang);
  if (m) return m[1].toLowerCase();
  return "us";
}

function slugifyForEmbed(title: string): string {
  const s = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return s || "song";
}

/** URL dell’Apple Music Web Embed per un brano (stesso tipo di widget condiviso da music.apple.com). */
export function appleMusicEmbedSongUrl(trackId: string, trackTitle: string): string {
  const slug = slugifyForEmbed(trackTitle);
  const sf = appleMusicStorefront();
  return `https://embed.music.apple.com/${sf}/song/${slug}/${trackId}`;
}
