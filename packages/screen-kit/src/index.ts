// @eliseo-arevalo/screen-kit — usability / product-demo videos from real UI captures.
// Playwright captures states + boxes (capture/capture.mjs), Remotion composes camera, cursor,
// click frames, ripples, callouts and keycaps from one scene JSON.
export { UsabilityScene, eventInfo, eventTarget } from './UsabilityScene';
export { UsabilityComposition } from './UsabilityComposition';
export { Camera } from './components/Camera';
export { Cursor, cursorPosition } from './components/Cursor';
export type { CursorMove } from './components/Cursor';
export { ClickFrame } from './components/ClickFrame';
export { Ripple } from './components/Ripple';
export { Callout } from './components/Callout';
export { Highlight } from './components/Highlight';
export { Keycap } from './components/Keycap';
export { StateStack } from './components/StateStack';
export { TextOverlay } from './components/TextOverlay';
export { Wipe } from './components/Wipe';
export * from './geometry';
export { PACING, pacingOf } from './pacing';
export { DEFAULT_THEME } from './theme';
export type * from './types';
