/** macOS / iOS / iPadOS browser (per UI AirPlay WebKit) */
export function isAppleUserAgent(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod|Macintosh/i.test(ua);
}

export function canUseWebKitAirPlayPicker(): boolean {
  if (typeof HTMLMediaElement === "undefined") return false;
  const proto = HTMLMediaElement.prototype as unknown as { webkitShowPlaybackTargetPicker?: () => void };
  return typeof proto.webkitShowPlaybackTargetPicker === "function";
}

/** @returns true se il picker è stato invocato */
export function showWebKitAirPlayPicker(media: HTMLMediaElement | null): boolean {
  if (!media) return false;
  const fn = (media as unknown as { webkitShowPlaybackTargetPicker?: () => void }).webkitShowPlaybackTargetPicker;
  if (typeof fn !== "function") return false;
  try {
    fn.call(media);
    return true;
  } catch {
    return false;
  }
}
