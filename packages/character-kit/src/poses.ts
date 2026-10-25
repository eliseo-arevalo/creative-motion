import type { ArmPose, Pose } from "./types";

/** Arms hanging relaxed: elbows soft, hands side-on next to the thigh (thumb forward). */
export const REST_ARM: ArmPose = { shoulder: 7, elbow: -6, wrist: -5, hand: "relaxed" };

export const REST: Pose = {
  x: 0,
  y: 0,
  lean: 0,
  torso: 0,
  neck: 0,
  head: 0,
  shrug: 0,
  armL: REST_ARM,
  armR: REST_ARM,
  legL: 2,
  legR: 2,
  knees: 0,
};

const pose = (p: Partial<Pose>): Pose => ({ ...REST, ...p });

/**
 * Pose library (angle objects). Arms either set angles directly or `reach` an anchor on the body
 * (solved per character with IK, so the same pose works on a child or an adult).
 */
export const POSES = {
  rest: REST,
  /** Screen-right arm up, palm to camera; head tilts toward the wave, weight onto that side. */
  wave: pose({ lean: 1.8, neck: 2, head: 4, armR: { shoulder: 118, elbow: 34, wrist: 0, hand: "open" } }),
  /** Arm out to screen right, index extended. */
  point: pose({ lean: 1.4, head: 4, neck: 1, armR: { shoulder: 84, elbow: 6, wrist: -4, hand: "point" } }),
  /** Knuckles under the chin, other forearm across the waist propping the elbow. */
  think: pose({
    lean: -0.8,
    neck: -1,
    head: 7,
    armR: { shoulder: 0, elbow: 0, wrist: 0, handDir: 174, hand: "point", upper: 0.8, pole: [0.25, 1], reach: { anchor: "chin", dx: 0.2, dy: 0.8 } },
  }),
  /** Hand on the side of the head, fingers in the hair. */
  scratch: pose({
    lean: -0.8,
    neck: -1.5,
    head: -6,
    armR: { shoulder: 0, elbow: 0, wrist: 0, handDir: -150, hand: "relaxed", upper: 0.85, pole: [0.95, 0.3], reach: { anchor: "headTop", dx: 0.55, dy: 0.7 } },
  }),
  /** Arms up, fists: "¡sí!". */
  celebrate: pose({
    y: -6,
    head: -2,
    armL: { shoulder: 148, elbow: 24, wrist: 4, hand: "fist" },
    armR: { shoulder: 148, elbow: 24, wrist: 4, hand: "fist" },
  }),
  /** Handing an item across the counter (arm out, grip). */
  give: pose({ lean: 2.4, head: 4, neck: 1, armR: { shoulder: 52, elbow: 22, wrist: -10, hand: "hold" } }),
  /** Phone pressed to the ear: wrist under the jaw, elbow down and out, head tilted into it. */
  phone: pose({
    lean: 0.6,
    neck: 2,
    head: 7,
    armR: { shoulder: 0, elbow: 0, wrist: 0, handDir: 180, hand: "hold", upper: 0.62, pole: [0.55, 1], reach: { anchor: "ear", dx: 0.2, dy: 0.5 } },
  }),
  /** Straight to camera, a touch back on the heels. */
  deadpan: pose({ lean: -0.5, head: 1, neck: 0.5 }),
  /** Fists on the hips. */
  akimbo: pose({
    lean: -0.6,
    head: -3,
    armL: { shoulder: 0, elbow: 0, wrist: 30, hand: "fist", reach: { anchor: "hip", dx: -0.2, dy: -0.35, bend: 1 } },
    armR: { shoulder: 0, elbow: 0, wrist: 30, hand: "fist", reach: { anchor: "hip", dx: -0.2, dy: -0.35, bend: 1 } },
  }),
  /** Shoulders down, head tilted: the low point of a sigh. */
  slump: pose({ y: 4, lean: -0.6, neck: 3, head: 5, shrug: -6, armL: { ...REST_ARM, shoulder: 4 }, armR: { ...REST_ARM, shoulder: 4 } }),
  /** Counting on the fingers: forearm up in front of the chest, palm to camera. */
  count: pose({
    lean: -0.4,
    neck: -1,
    head: 3,
    armR: { shoulder: 0, elbow: 0, wrist: 0, handDir: 172, hand: "count1", upper: 0.9, pole: [0.15, 1], reach: { anchor: "chest", dx: 0.5, dy: 0.15 } },
  }),
  /** Phone held up in front of the chest (left hand), right index pointing at it. */
  pointPhone: pose({
    lean: 0.4,
    neck: -1.5,
    head: -4,
    armL: { shoulder: 0, elbow: 0, wrist: 0, handDir: 178, hand: "hold", upper: 0.9, pole: [0.2, 1], reach: { anchor: "chest", dx: 0.75, dy: 0.15 } },
    armR: { shoulder: 0, elbow: 0, wrist: 0, handDir: -104, hand: "point", upper: 0.95, pole: [0.25, 1], reach: { anchor: "chest", dx: 0.55, dy: 0.35 } },
  }),
  /** Hand flat on the cheek (palm on the face), elbow down, head leaning into it: "mmm… ¿y ahora?". */
  cheek: pose({
    lean: -0.6,
    neck: 2,
    head: 7,
    armR: { shoulder: 0, elbow: 0, wrist: 0, handDir: 168, hand: "flat", upper: 0.8, pole: [0.25, 1], reach: { anchor: "cheek", dx: 0.12, dy: 0.42 } },
  }),
  /** "¿Qué le vamos a hacer?": shoulders up, elbows in, forearms out, palms up. */
  shrug: pose({
    lean: -0.4,
    neck: 2,
    head: 6,
    shrug: 16,
    armL: { shoulder: 10, elbow: 36, wrist: 0, handDir: 96, hand: "open" },
    armR: { shoulder: 10, elbow: 36, wrist: 0, handDir: 96, hand: "open" },
  }),
  /** Answering the phone, 1: hand at the trouser pocket, gripping the phone. */
  phonePocket: pose({
    lean: 0.3,
    neck: -1,
    head: -3,
    armR: { shoulder: 0, elbow: 0, wrist: 0, handDir: 4, hand: "hold", reach: { anchor: "pocket", dx: 0.15, dy: -0.25 } },
  }),
  /** Answering the phone, 2: phone up in front of the chest, glancing at the screen. */
  phoneLook: pose({
    lean: -0.3,
    neck: -2,
    head: -5,
    armR: { shoulder: 0, elbow: 0, wrist: 0, handDir: 176, hand: "hold", upper: 0.85, pole: [0.2, 1], reach: { anchor: "chest", dx: 0.6, dy: -0.35 } },
  }),
  /** Answering the phone, last: arm back down, phone still in hand. */
  phoneDown: pose({ lean: 0.2, head: 1, armR: { shoulder: 6, elbow: -16, wrist: -6, hand: "hold" } }),
} satisfies Record<string, Pose>;

export type PoseName = keyof typeof POSES;
