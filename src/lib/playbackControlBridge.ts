/** Mirrors playbackToggleBridge — lets external UI (NowPlayingRail) drive FullPlayer skip/repeat/shuffle */
let skipPrevHandler: (() => void) | null = null;
let skipNextHandler: (() => void) | null = null;
let shuffleToggleHandler: (() => void) | null = null;
let repeatCycleHandler: (() => void) | null = null;

export function setSkipPrevHandler(fn: (() => void) | null) { skipPrevHandler = fn; }
export function setSkipNextHandler(fn: (() => void) | null) { skipNextHandler = fn; }
export function setShuffleToggleHandler(fn: (() => void) | null) { shuffleToggleHandler = fn; }
export function setRepeatCycleHandler(fn: (() => void) | null) { repeatCycleHandler = fn; }

export function requestSkipPrev() { skipPrevHandler?.(); }
export function requestSkipNext() { skipNextHandler?.(); }
export function requestShuffleToggle() { shuffleToggleHandler?.(); }
export function requestRepeatCycle() { repeatCycleHandler?.(); }
