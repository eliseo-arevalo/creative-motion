import { clamp, lerp, transition } from "./math";
import type { TurnKey } from "./types";

const TURN_FEEL = { damping: 15, stiffness: 95, mass: 0.8 };

/**
 * Yaw (3/4 turn) at a frame: −1 … 1, where ±1 is a full three-quarter view (face toward screen
 * left / right) and 0 faces the camera. Each key springs in from wherever the previous ones left it.
 */
export const yawAt = (keys: TurnKey[] | undefined, frame: number, fps: number) => {
  if (!keys || keys.length === 0) return 0;
  let y = keys[0].yaw;
  for (let i = 1; i < keys.length; i++) {
    if (frame < keys[i].at) break;
    y = lerp(y, keys[i].yaw, transition(frame - keys[i].at, fps, 0.04, TURN_FEEL).t);
  }
  return clamp(y, -1.1, 1.1);
};
