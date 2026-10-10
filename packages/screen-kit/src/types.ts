export type Rect = { x: number; y: number; width: number; height: number };
export type Pt = { x: number; y: number };
/** "name" (box from the first captured state) or "name@state" (box measured in that state). */
export type BoxRef = string;
export type TargetRef = { target: BoxRef; dx?: number; dy?: number };
export type CameraTo =
  | 'full'
  | 'wide'
  | { wide: number; dx?: number; dy?: number }
  | { target: BoxRef; padding?: number; scale?: number; maxScale?: number; dx?: number; dy?: number }
  | { rect: Rect; padding?: number; scale?: number; maxScale?: number };
/** zone = continuous move: brief zoom-out to a midpoint that shows both zones, then pan/zoom in (direct zoom if close). */
export type Transition = 'ease' | 'spring' | 'zone' | 'cut' | 'wipe';
export type WipeDir = 'left' | 'right' | 'up' | 'down';
export type CameraKey = { at: number; to: CameraTo; duration?: number; transition?: Transition; easing?: 'cubic' | 'sine'; wipeFrames?: number; direction?: WipeDir; read?: number };
/** clicks/hovers are frames; their target is the destination of the cursor move that ended last before
 *  that frame, so the click ring + ripple always land on the element the cursor is actually on. */
export type CursorTrack = { appearAt?: number; hideAt?: number; start: Pt | TargetRef; moves: { at: number; duration?: number; to: Pt | TargetRef; arc?: number }[]; clicks?: number[]; hovers?: number[]; scale?: number; /** tiny idle drift (px) so a resting cursor feels held by a hand */ drift?: number };
export type Side = 'below' | 'above' | 'left' | 'right';
export type Pacing = 'snappy' | 'calm' | 'gentle';
export type Timeline = {
  pacing?: Pacing;
  /** rules the lint enforces (defaults: continuity on, maxCallouts 2, cursorAlways on) */
  rules?: { continuity?: boolean; maxCallouts?: number; cursorAlways?: boolean; maxScaleRatio?: number; emphasisMatchesClick?: boolean; clickFrames?: boolean; startScale?: number; maxZoom?: number; minHold?: number; minMove?: number; maxActionsPer10s?: number; maxZoomInsPerMin?: number; stillOnAction?: boolean; resultInView?: boolean; readingWps?: number; minTextHold?: number; maxLabelChars?: number; minReadHold?: number };
  /** zone moves never zoom out below this when both ends are ≥ it (default 1 = page fills the frame) */
  zoneFloor?: number;
  wideScale?: number;
  maxScale?: number;
  camera: CameraKey[];
  cursor?: CursorTrack;
  cursors?: CursorTrack[];
  states: { at: number; name: string; crossfadeFrames?: number; playFrames?: number; result?: string }[];
  ripples?: ({ at: number } & TargetRef)[];
  highlights?: { at: number; duration: number; target: BoxRef; padding?: number }[];
  callouts?: { at: number; duration: number; target: BoxRef; padding?: number; label: string; side?: Side; lead?: number; out?: boolean }[];
  /** keyboard overlay: small keycap bottom-centre that depresses on each press */
  keys?: { at: number; key: string }[];
  texts?: { at: number; duration?: number; text: string; x?: number; y?: number; size?: number; weight?: number; font?: string; color?: string; mono?: boolean }[];
};
export type Scene = {
  id: string;
  composition: { fps: number; durationInFrames: number; width?: number; height?: number; background?: string; timeline: Timeline; theme?: { ink?: string; paper?: string; font?: string; monoFont?: string; /** emphasis colour for boxes, callouts, click rings/ripples */ accent?: string; accentInk?: string } };
};
export type ManifestState = { name: string; file: string; boxes?: Record<string, Rect>; sequenceOf?: string; index?: number; dpr?: number };
export type Manifest = {
  id: string;
  viewport: { width: number; height: number };
  deviceScaleFactor: number;
  states: ManifestState[];
  boxes: Record<string, Rect>;
  fonts: string[];
};
export type Props = { sceneId: string; scene?: Scene; manifest?: Manifest };
