export const OPEN_TUTORIAL_EVENT = "echoes:open-tutorial";

export function openUserTutorial() {
  window.dispatchEvent(new CustomEvent(OPEN_TUTORIAL_EVENT, { detail: { followPages: true } }));
}
