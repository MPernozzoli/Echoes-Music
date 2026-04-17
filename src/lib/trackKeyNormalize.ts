/** Chiave stabile per cache DB / session (titolo||artista, lower + trim). */
export function normalizeTitleArtist(title: string, artist: string): { title: string; artist: string } {
  return { title: title.trim().toLowerCase(), artist: artist.trim().toLowerCase() };
}

export function normalizeQueryKey(title: string, artist: string): string {
  const { title: t, artist: a } = normalizeTitleArtist(title, artist);
  return `${t}||${a}`;
}
