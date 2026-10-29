import { useId } from "react";
import {
  Character,
  CLIPS,
  POSES,
  type ExpressionMix,
  type ExpressionName,
  type FaceKey,
  type HoldRender,
  type LookKey,
  type Pose,
  type PoseKey as KitPoseKey,
  type TurnKey,
} from "@eliseo-arevalo/character-kit";
import type { PoseKey } from "../kit/Shopkeeper";
import { TENDERA } from "../characters/specs";
import { PHONE } from "../characters/props";
import { anotoEs, listoEs, remateEs } from "./lipsync";
import { colors } from "../tokens";
import type { TenderaProps } from "./scenes";

/**
 * The reel's tendera drawn with character-kit, in the same 900×820 box (arch + counter) the old
 * Shopkeeper used, so every scene's framing stays put. Old pose names map to kit clips,
 * expressions and 3/4 turns; held props from the scenes go into the hand's grip slot.
 */

// Kit canvas (800×1500) → Shopkeeper box (900×820): head centre (400, 596) lands on (466, 186).
const K = 1.1;
const OX = 466 - 400 * K;
const OY = 186 - 596 * K;

type OldPose = PoseKey["pose"];

/** Old reel pose → kit clip (or inline pose), face, turn toward the customer, hand override. */
const POCKET: Pose = {
  ...POSES.rest,
  lean: 0.8,
  head: 3,
  armR: { shoulder: 0, elbow: 0, wrist: 0, handDir: 10, hand: "pinch", upper: 1, reach: { anchor: "pocket", dx: 0.15, dy: -0.25, bend: 1 } },
};
const MAP: Record<string, { clip?: keyof typeof CLIPS; pose?: Pose; face: ExpressionName; yaw: number; look?: { x: number; y: number } }> = {
  idle: { clip: "idle", face: "neutral", yaw: 0 },
  wave: { clip: "wave", face: "happy", yaw: 0.25 },
  point: { clip: "point", face: "happy", yaw: 0.45, look: { x: 780, y: 760 } },
  phone: { clip: "phone", face: "neutral", yaw: -0.35 },
  cheer: { clip: "celebrate", face: "happy", yaw: 0 },
  give: { clip: "give", face: "happy", yaw: 0.6, look: { x: 820, y: 900 } },
  think: { clip: "cheek", face: "thinking", yaw: -0.2 },
  reach: { clip: "give", face: "neutral", yaw: 0.5 },
  relief: { clip: "sigh", face: "happy", yaw: 0 },
  worry: { clip: "count", face: "worried", yaw: 0 },
  scratch: { clip: "scratch", face: "worried", yaw: -0.15 },
  chin: { clip: "think", face: "thinking", yaw: 0 },
  deadpan: { clip: "deadpan", face: "deadpan", yaw: 0 },
  pocket: { pose: POCKET, face: "happy", yaw: 0.15 },
};

const LINES = { anoto: anotoEs, remate: remateEs, listo: listoEs };

/** Under stress she never smiles: happy / neutral read as worried. */
const faceFor = (name: ExpressionName, stressed?: boolean): ExpressionMix | ExpressionName =>
  stressed && (name === "happy" || name === "neutral") ? "worried" : name;

export const KitTendera: React.FC<TenderaProps> = ({ left, top, width, poses, holding, seed = 0, stressed, says }) => {
  const clip = `ck-${useId().replace(/:/g, "")}`;
  const keys = poses.map((k) => ({ at: k.at, m: MAP[k.pose as OldPose] ?? MAP.idle, name: k.pose }));
  const holdingNow = holding ? holding({ x: 0, y: 0, angle: 0 }) != null : false;

  const track: KitPoseKey[] = keys.map(({ at, m, name }) => {
    // While she holds the bill / coin the hand is a pinch around it.
    if (name === "give") {
      // In the reel the customer's hand is up at counter height: reach out level to it.
      const g = CLIPS.give.pose;
      const armR = { ...g.armR, shoulder: 84, elbow: -8, wrist: 6, hand: holding ? ("pinch" as const) : g.armR.hand };
      return { at, clip: { ...CLIPS.give, pose: { ...g, armR } } };
    }
    if (holding && name === "pocket") return { at, pose: POCKET };
    return m.pose ? { at, pose: m.pose } : { at, clip: m.clip ?? "idle" };
  });
  const face: FaceKey[] = keys.map(({ at, m }) => ({ at: at + 2, mix: faceFor(m.face, stressed) }));
  const turn: TurnKey[] = keys.map(({ at, m }) => ({ at, yaw: m.yaw }));
  const look: LookKey[] = keys.map(({ at, m }) => ({ at: at + 1, target: m.look ?? "camera" }));

  // Props from the scenes are drawn in the old 900-space at the wrist; in the kit they sit in the
  // grip slot, upright, at the same on-screen size, so the fingers close over them.
  const hand = TENDERA.proportions.hand / 82;
  const holdR: HoldRender = (info) => {
    if (info.shape === "hold") return PHONE(info);
    if (info.shape === "pinch" && holding && holdingNow) return <g transform={`rotate(${-info.worldAngle}) scale(${1 / (K * hand)}) translate(6 10)`}>{holding({ x: 0, y: 0, angle: 0 })}</g>;
    return null;
  };

  return (
    <div style={{ position: "absolute", left, top, width, height: (width * 820) / 900 }}>
      <svg width="100%" height="100%" viewBox="0 0 900 820" fill="none">
        <defs>
          <clipPath id={clip}>
            <rect x="-200" y="-400" width="1300" height="1028" />
          </clipPath>
        </defs>
        <path d="M106 638V250C106 -60 796 -60 796 250V638Z" fill={colors.primarySoft} />
        <g clipPath={`url(#${clip})`}>
          <svg x={OX} y={OY} width={800 * K} height={1500 * K} overflow="visible">
            <Character
              spec={TENDERA}
              track={track}
              face={face}
              turn={turn}
              look={look}
              seed={seed + 3}
              holdR={holdR}
              speech={says ? [{ from: says.at, cues: LINES[says.line] }] : undefined}
            />
          </svg>
        </g>
        <rect x="122" y="524" width="145" height="97" rx="8" fill={colors.paper} stroke={colors.ink} strokeWidth="5" />
        <path d="M194 524V564M169 564H216" stroke={colors.ink} strokeWidth="5" />
        <rect x="82" y="611" width="745" height="35" rx="17" fill={colors.ink} />
        <path d="M113 646H797L771 782H136Z" fill={colors.accent} />
        <path d="M148 672H753M162 694H740" stroke={colors.accentDeep} strokeWidth="3" />
      </svg>
    </div>
  );
};
