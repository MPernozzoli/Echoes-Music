/** Larghezza barra decorativa 42–100% da stringa (solo visual, non metrica scientifica) */
export function stringToMeterPercent(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = value.charCodeAt(i) + ((h << 5) - h);
  }
  return 42 + (Math.abs(h) % 58);
}
