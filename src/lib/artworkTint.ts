import type { CSSProperties } from "react";

/** Tint HSL (space syntax) derivato da id per gradient coerenti senza analisi immagine */
export function artworkTintFromId(id: string): CSSProperties {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  const s = 55 + (Math.abs(hash >> 3) % 35);
  const l = 38 + (Math.abs(hash >> 7) % 22);
  return {
    ["--artwork-h" as string]: String(h),
    ["--artwork-s" as string]: `${s}%`,
    ["--artwork-l" as string]: `${l}%`,
  } as CSSProperties;
}
