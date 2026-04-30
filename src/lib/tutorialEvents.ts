export const OPEN_TUTORIAL_EVENT = "echoes:open-tutorial";

export function openUserTutorial() {
  window.dispatchEvent(new Event(OPEN_TUTORIAL_EVENT));
}
