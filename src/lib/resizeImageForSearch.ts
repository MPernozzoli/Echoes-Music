const MAX_EDGE = 1024;
const JPEG_QUALITY = 0.82;

export type ResizedImageForSearch = {
  base64: string;
  mimeType: string;
  dataUrl: string;
};

function loadImageBitmap(file: Blob): Promise<ImageBitmap> {
  return createImageBitmap(file);
}

/**
 * Ridimensiona e comprime un'immagine per inviarla al modello (payload JSON).
 */
export async function resizeImageForSearch(file: File): Promise<ResizedImageForSearch> {
  const bitmap = await loadImageBitmap(file);
  const w = bitmap.width;
  const h = bitmap.height;
  const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas non disponibile");
  ctx.drawImage(bitmap, 0, 0, tw, th);
  bitmap.close?.();

  const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
  const dataUrl =
    mimeType === "image/png"
      ? canvas.toDataURL("image/png")
      : canvas.toDataURL("image/jpeg", JPEG_QUALITY);

  const comma = dataUrl.indexOf(",");
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : "";
  if (!base64) throw new Error("Codifica immagine fallita");

  return { base64, mimeType, dataUrl };
}
