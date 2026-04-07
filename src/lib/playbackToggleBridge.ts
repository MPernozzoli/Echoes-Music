/** Permette al di fuori del FullPlayer di richiedere play/pausa (es. popover brano in chat). */
let handler: (() => void) | null = null;

export function setPlaybackToggleHandler(fn: (() => void) | null) {
  handler = fn;
}

export function requestPlaybackToggle() {
  handler?.();
}
