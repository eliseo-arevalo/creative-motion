import { useId, type CSSProperties } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { blinkAt, faceAt, lookAt } from "./face";
import { CANVAS, forward, hipY } from "./rig";
import { armFrontAt, evaluatePose } from "./timeline";
import { visemeAt } from "./visemes";
import { yawAt } from "./turn";
import { torsoPath } from "./parts/Body";
import { Apron, Bottom, Neck, Top } from "./parts/Body";
import { Head } from "./parts/Head";
import { Arm, Leg } from "./parts/Limbs";
import type { CharacterSpec, FaceKey, HoldRender, LookKey, PoseKey, SpeechClip, TurnKey } from "./types";

export type CharacterProps = {
  spec: CharacterSpec;
  /** Pose / gesture keys (clips by name or inline poses). Default: idle. */
  track?: PoseKey[];
  /** Expression keys (mixable). Default: neutral. */
  face?: FaceKey[];
  /** Look-at keys (canvas px or "camera"). */
  look?: LookKey[];
  /** Three-quarter turn keys (yaw −1…1). The head leads, the body follows ~3 frames later. */
  turn?: TurnKey[];
  /** Lip-sync clips (Rhubarb cues, seconds from `from`). */
  speech?: SpeechClip[];
  /** Offsets blink / breathing so two characters never move in sync. */
  seed?: number;
  /** Objects held in a "hold" hand, drawn between the palm and the fingers. */
  holdL?: HoldRender;
  holdR?: HoldRender;
  /** Soft contact shadow on the ground. */
  shadow?: boolean;
  /** Draw the skeleton's pivots on top (rig debugging). */
  debug?: boolean;
  /** Crop of the 800×1500 canvas (SVG viewBox). */
  viewBox?: string;
  style?: CSSProperties;
};

const Pivot: React.FC<{ on?: boolean }> = ({ on }) => (on ? <circle r={6} fill="#E5484D" stroke="#fff" strokeWidth={2} /> : null);

/**
 * A rigged 2D character. Hierarchy: hips → (legs, skirt) → torso → (neck → head) + (shoulder → elbow → wrist → hand).
 * Each bone rotates around a real pivot; joints are same-colour round caps, so nothing seams.
 */
export const Character: React.FC<CharacterProps> = ({ spec, track, face, look, turn, speech, seed = 0, holdL, holdR, shadow, debug, viewBox, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spec.proportions;
  const c = spec.palette;
  const keys = track && track.length > 0 ? track : [{ at: 0, clip: "idle" }];
  const { pose, dip, prev } = evaluatePose(keys, frame, fps, p);

  // Breathing (~3.6 s cycle) and weight.
  const b = Math.sin((frame + seed * 17) / 17) * (spec.breath ?? 1);
  const rise = p.torso * 0.012 * b;

  // Secondary motion from velocities (pose now vs. 3 frames ago).
  const hipVel = pose.lean - prev.lean + (pose.x - prev.x) * 0.15 + (pose.y - prev.y) * 0.05;
  const sway = -hipVel * 2.6 + Math.sin((frame + seed * 17) / 17 - 0.8) * 0.4;
  const tail = sway * 1.8 + Math.sin((frame + seed * 5) / 11) * 3;
  const headVel = pose.head + pose.neck + pose.lean - (prev.head + prev.neck + prev.lean);
  const hairLag = -headVel * 1.8;

  // Face.
  const fp = faceAt(face, frame);
  const headPos = forward(spec, pose).head;
  const lk = lookAt(look, frame, headPos);
  const talk = visemeAt(speech, frame, fps);
  const talkBob = talk ? Math.sin(frame / 3.2) * 0.7 * talk.shape.open : 0;
  const blink = blinkAt(frame, seed, fps);

  const hy = hipY(p) + pose.y + dip * 6;
  const T = p.torso;
  const S = p.shoulderHalf;

  // 3/4 turn: the head leads, the body follows (less, and a few frames later).
  const clipId = useId();
  const yawH = yawAt(turn, frame, fps);
  const yawB = yawAt(turn, frame - 3, fps) * 0.75;
  const ab = Math.abs(yawB);
  const bodySX = 1 - 0.1 * ab;
  const shoulderX = (side: 1 | -1) => side * S * (side * yawB > 0 ? 1 - 0.3 * ab : 1 - 0.05 * ab) + yawB * S * 0.04;
  // Front/behind layer weight per arm (1 = in front). Averaged over past frames, so an arm that goes
  // behind the torso on a turn crossfades between layers instead of flickering.
  const frontW = { [-1]: armFrontAt(keys, frame, fps, p, -1, yawB), [1]: armFrontAt(keys, frame, fps, p, 1, yawB) } as Record<1 | -1, number>;
  const arm = (side: 1 | -1, opacity = 1) => (
    <g key={side} opacity={opacity < 1 ? opacity : undefined} transform={`translate(${shoulderX(side)} ${-T + p.shoulderDrop - pose.shrug - rise}) scale(${side} 1)`}>
      <Arm arm={side < 0 ? pose.armL : pose.armR} p={p} c={c} top={spec.top} slot={slot(side < 0 ? holdL : holdR, side < 0 ? "L" : "R")} debug={debug} />
    </g>
  );

  const slot = (fn: HoldRender | undefined, side: "L" | "R") => {
    if (!fn) return undefined;
    const a = side === "L" ? pose.armL : pose.armR;
    const sg = side === "L" ? 1 : -1;
    const worldAngle = pose.lean + pose.torso + sg * (a.shoulder + a.elbow + a.wrist);
    const shape = a.handFrom && (a.handMix ?? 1) < 0.5 ? a.handFrom : a.hand;
    return <>{fn({ side, worldAngle, shape })}</>;
  };

  return (
    <svg viewBox={viewBox ?? `0 0 ${CANVAS.width} ${CANVAS.height}`} width="100%" height="100%" style={{ overflow: "visible", ...style }} fill="none">
      {shadow && <ellipse cx={CANVAS.centerX + pose.x} cy={CANVAS.ground} rx={p.hipHalf * 1.5 + pose.y * 0.4} ry={16} fill="#000" opacity={0.1} />}
      <g transform={`translate(${CANVAS.centerX + pose.x} ${hy}) rotate(${pose.lean})`}>
        {([-1, 1] as const).map((side) => (
          <g key={side} transform={`translate(${side * p.legGap * (1 - 0.3 * ab) + yawB * 8} 8) scale(${side} 1)`}>
            <Leg angle={side < 0 ? pose.legL : pose.legR} bend={pose.knees} p={p} c={c} bottom={spec.bottom} shoes={spec.shoes} />
          </g>
        ))}
        <g transform={`scale(${bodySX} 1)`}>
          <Bottom p={p} bottom={spec.bottom} sway={sway} />
        </g>
        <Pivot on={debug} />
        <g transform={`rotate(${pose.torso})`}>
          {([-1, 1] as const).filter((s) => frontW[s] < 0.999).map((s) => arm(s))}
          <g transform={`translate(${yawB * 6} ${-T - rise - pose.shrug * 0.3}) rotate(${pose.neck})`}>
            <Neck p={p} c={c} />
          </g>
          <g transform={`scale(${(1 + b * 0.006) * bodySX} ${1 + b * 0.012})`}>
            <Top p={p} c={c} top={spec.top} />
            {ab > 0.02 && (
              <>
                <defs>
                  <mask id={clipId}>
                    <path d={torsoPath(p)} fill="#fff" />
                    <path d={torsoPath(p)} fill="#000" transform={`translate(${yawB * S * 0.5} 0)`} />
                  </mask>
                </defs>
                {/* The side plane that comes into view on the near side. */}
                <rect x={-S * 2} y={-T - 60} width={S * 4} height={T + 120} fill={spec.top.shade} opacity={0.6} mask={`url(#${clipId})`} />
              </>
            )}
          </g>
          <g transform={`translate(${yawB * S * 0.24} 0) scale(${(1 + b * 0.006) * (1 - 0.2 * ab)} ${1 + b * 0.012})`}>
            {spec.accessories?.map((a, i) =>
              a.kind === "necklace" ? (
                <g key={i}>
                  <path d={`M${-p.neckHalf - 8} ${-T + 4}Q0 ${-T + 56} ${p.neckHalf + 8} ${-T + 4}`} stroke={a.color} strokeWidth={4} fill="none" />
                  <circle cx={0} cy={-T + 32} r={6} fill={a.color} />
                </g>
              ) : null,
            )}
            {spec.apron && <Apron p={p} apron={spec.apron} sway={sway} tail={tail} />}
          </g>
          <g transform={`translate(${yawB * 8} ${-T - rise - pose.shrug * 0.3}) rotate(${pose.neck}) translate(0 ${-p.neck}) rotate(${pose.head + lk.tilt + talkBob})`}>
            <Head p={p} c={c} head={spec.head} hair={spec.hair} accessories={spec.accessories ?? []} hairLag={hairLag} state={{ face: fp, blink, look: lk, mouth: talk?.shape ?? null, yaw: yawH }} />
            <Pivot on={debug} />
          </g>
          {([-1, 1] as const).filter((s) => frontW[s] > 0.001).map((s) => arm(s, frontW[s]))}
        </g>
      </g>
    </svg>
  );
};
