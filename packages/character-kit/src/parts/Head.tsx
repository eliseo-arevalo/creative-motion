import type { Accessory, FaceParams, HairSpec, HeadSpec, MouthShape, Palette, Proportions } from "../types";
import { clamp, clamp01 } from "../math";
import { Mouth } from "./Mouth";

type G = { rx: number; ry: number; cy: number };

const facePath = (shape: HeadSpec["shape"], { rx, ry, cy }: G) => {
  if (shape === "soft") {
    // Wide cheekbones, softer narrower chin.
    return `M${-rx} ${cy - 6}C${-rx} ${cy - ry * 1.12} ${rx} ${cy - ry * 1.12} ${rx} ${cy - 6}C${rx} ${cy + ry * 0.5} ${rx * 0.5} ${cy + ry} 0 ${cy + ry}C${-rx * 0.5} ${cy + ry} ${-rx} ${cy + ry * 0.5} ${-rx} ${cy - 6}Z`;
  }
  const k = shape === "round" ? 1.05 : 1;
  const r = rx * k;
  const v = shape === "round" ? ry * 0.96 : ry;
  return `M${-r} ${cy}A${r} ${v} 0 1 0 ${r} ${cy}A${r} ${v} 0 1 0 ${-r} ${cy}Z`;
};

/** Hair behind the head (bun, nape, back of a bob). */
const HairBack: React.FC<{ hair: HairSpec; g: G; yaw?: number }> = ({ hair, g: { rx, ry, cy }, yaw = 0 }) => {
  const bx = -yaw * rx * 0.42; // buns / ponytails swing to the back of the head
  const back = `M${-rx - 8} ${cy + 6}C${-rx - 16} ${cy - ry * 1.02} ${rx + 16} ${cy - ry * 1.02} ${rx + 8} ${cy + 6}C${rx + 10} ${cy + ry * 0.45} ${rx - 4} ${cy + ry * 0.64} ${rx - 18} ${cy + ry * 0.6}L${-rx + 18} ${cy + ry * 0.6}C${-rx + 4} ${cy + ry * 0.64} ${-rx - 10} ${cy + ry * 0.45} ${-rx - 8} ${cy + 6}Z`;
  switch (hair.kind) {
    case "bun":
      return (
        <>
          <circle cx={rx * 0.08 + bx} cy={cy - ry - rx * 0.22} r={rx * 0.46} fill={hair.color} />
          <path transform={`translate(${bx} 0)`} d={`M${-rx * 0.2} ${cy - ry - rx * 0.05}Q${rx * 0.1} ${cy - ry - rx * 0.45} ${rx * 0.4} ${cy - ry - rx * 0.12}`} stroke={hair.shine ?? hair.shade} strokeWidth={5} strokeLinecap="round" fill="none" />
          <path d={back} fill={hair.color} />
        </>
      );
    case "lowBun":
      return (
        <>
          <circle cx={rx * 0.86 + bx * 0.5} cy={cy + ry * 0.32} r={rx * 0.36} fill={hair.color} />
          <circle cx={rx * 0.86 + bx * 0.5} cy={cy + ry * 0.32} r={rx * 0.2} fill="none" stroke={hair.shade} strokeWidth={4} />
          <path d={back} fill={hair.color} transform={`translate(0 ${-ry * 0.12}) scale(1 0.92)`} />
        </>
      );
    case "bob":
      return <path d={`M${-rx - 14} ${cy}C${-rx - 18} ${cy - ry * 1.1} ${rx + 18} ${cy - ry * 1.1} ${rx + 14} ${cy}L${rx + 18} ${cy + ry * 0.75}H${-rx - 18}Z`} fill={hair.color} />;
    case "curly":
      return (
        <>
          {Array.from({ length: 9 }, (_, i) => {
            const a = Math.PI * (1.05 + (i / 8) * 0.9);
            return <circle key={i} cx={Math.cos(a) * (rx + 6)} cy={cy + Math.sin(a) * (ry + 2)} r={rx * 0.3} fill={hair.color} />;
          })}
        </>
      );
    case "short":
      return <path d={`M${-rx - 4} ${cy + 4}C${-rx - 10} ${cy - ry * 1.08} ${rx + 10} ${cy - ry * 1.08} ${rx + 4} ${cy + 4}Z`} fill={hair.color} />;
  }
};

/** Hair over the forehead (fringe / hairline). `shift` follows the head turn a little. */
const HairFront: React.FC<{ hair: HairSpec; g: G; shift: number }> = ({ hair, g: { rx, ry, cy }, shift }) => {
  const s = shift * 0.5;
  switch (hair.kind) {
    case "bun":
      return (
        <g transform={`translate(${s} 0)`}>
          <path
            d={`M${-rx + 3} ${cy - ry * 0.12}C${-rx - 6} ${cy - ry * 0.98} ${-rx * 0.2} ${cy - ry * 1.1} ${rx * 0.1} ${cy - ry * 1.04}C${rx * 0.72} ${cy - ry * 1.0} ${rx + 8} ${cy - ry * 0.6} ${rx - 3} ${cy - ry * 0.1}C${rx * 0.66} ${cy - ry * 0.36} ${rx * 0.34} ${cy - ry * 0.5} ${rx * 0.12} ${cy - ry * 0.72}C${-rx * 0.12} ${cy - ry * 0.46} ${-rx * 0.52} ${cy - ry * 0.36} ${-rx + 3} ${cy - ry * 0.12}Z`}
            fill={hair.color}
          />
          <path d={`M${rx * 0.12} ${cy - ry * 0.92}C${rx * 0.45} ${cy - ry * 0.9} ${rx * 0.7} ${cy - ry * 0.74} ${rx * 0.8} ${cy - ry * 0.5}`} stroke={hair.shine ?? hair.shade} strokeWidth={5} strokeLinecap="round" fill="none" />
        </g>
      );
    case "lowBun":
      return (
        <g transform={`translate(${s} 0)`}>
          <path d={`M${-rx + 2} ${cy - ry * 0.02}C${-rx - 8} ${cy - ry * 1.04} ${rx + 8} ${cy - ry * 1.04} ${rx - 2} ${cy - ry * 0.02}C${rx * 0.65} ${cy - ry * 0.45} ${rx * 0.2} ${cy - ry * 0.62} 0 ${cy - ry * 0.72}C${-rx * 0.2} ${cy - ry * 0.62} ${-rx * 0.65} ${cy - ry * 0.45} ${-rx + 2} ${cy - ry * 0.02}Z`} fill={hair.color} />
          <path d={`M${-rx * 0.2} ${cy - ry * 0.86}Q${-rx * 0.55} ${cy - ry * 0.7} ${-rx * 0.72} ${cy - ry * 0.36}M${rx * 0.2} ${cy - ry * 0.86}Q${rx * 0.55} ${cy - ry * 0.7} ${rx * 0.72} ${cy - ry * 0.36}`} stroke={hair.shade} strokeWidth={4} strokeLinecap="round" fill="none" />
        </g>
      );
    case "short":
    case "curly":
      return (
        <g transform={`translate(${s} 0)`}>
          <path d={`M${-rx + 1} ${cy - ry * 0.05}C${-rx - 6} ${cy - ry * 1.06} ${rx + 6} ${cy - ry * 1.06} ${rx - 1} ${cy - ry * 0.05}L${rx - 9} ${cy - ry * 0.3}C${rx * 0.5} ${cy - ry * 0.56} ${-rx * 0.15} ${cy - ry * 0.6} ${-rx * 0.58} ${cy - ry * 0.46}L${-rx + 9} ${cy - ry * 0.3}Z`} fill={hair.color} />
          <path d={`M${-rx * 0.3} ${cy - ry * 0.8}Q${rx * 0.2} ${cy - ry * 0.92} ${rx * 0.62} ${cy - ry * 0.66}`} stroke={hair.shine ?? hair.shade} strokeWidth={4} strokeLinecap="round" fill="none" />
        </g>
      );
    case "bob":
      return (
        <g transform={`translate(${s} 0)`}>
          <path d={`M${-rx - 2} ${cy + ry * 0.1}C${-rx - 8} ${cy - ry * 1.06} ${rx + 8} ${cy - ry * 1.06} ${rx + 2} ${cy + ry * 0.1}C${rx * 0.6} ${cy - ry * 0.42} ${-rx * 0.6} ${cy - ry * 0.42} ${-rx - 2} ${cy + ry * 0.1}Z`} fill={hair.color} />
        </g>
      );
  }
};

const AccessoryFront: React.FC<{ a: Accessory; g: G; eyes: { x: number; y: number }; turn: number; c: Palette }> = ({ a, g: { rx, ry, cy }, eyes, turn, c }) => {
  switch (a.kind) {
    case "glasses":
      return (
        <g transform={`translate(${turn} 0)`} stroke={a.color} strokeWidth={4.5} fill="none">
          <circle cx={-eyes.x} cy={eyes.y} r={19} fill="#FFFFFF" fillOpacity={0.12} />
          <circle cx={eyes.x} cy={eyes.y} r={19} fill="#FFFFFF" fillOpacity={0.12} />
          <path d={`M${-eyes.x + 19} ${eyes.y - 3}Q0 ${eyes.y - 10} ${eyes.x - 19} ${eyes.y - 3}`} />
          <path d={`M${-eyes.x - 19} ${eyes.y - 4}L${-rx + 2 - turn} ${eyes.y - 8}M${eyes.x + 19} ${eyes.y - 4}L${rx - 2 - turn} ${eyes.y - 8}`} />
        </g>
      );
    case "cap":
      return (
        <g transform={`translate(${turn * 0.4} 0)`}>
          <path d={`M${-rx - 5} ${cy - ry * 0.22}C${-rx - 6} ${cy - ry * 1.18} ${rx + 6} ${cy - ry * 1.18} ${rx + 5} ${cy - ry * 0.22}Z`} fill={a.color} />
          <path d={`M${-rx * 0.6} ${cy - ry * 0.98}Q${-rx * 0.2} ${cy - ry * 0.5} ${-rx * 0.15} ${cy - ry * 0.24}M${rx * 0.35} ${cy - ry * 1.0}Q${rx * 0.5} ${cy - ry * 0.55} ${rx * 0.55} ${cy - ry * 0.24}`} stroke={a.brim} strokeWidth={3} fill="none" opacity={0.6} />
          <path d={`M${-rx - 6} ${cy - ry * 0.24}Q${rx * 0.2} ${cy - ry * 0.06} ${rx * 1.45} ${cy - ry * 0.12}Q${rx * 1.3} ${cy - ry * 0.36} ${rx * 0.6} ${cy - ry * 0.36}Q${-rx * 0.3} ${cy - ry * 0.4} ${-rx - 6} ${cy - ry * 0.24}Z`} fill={a.brim} />
          <circle cx={0} cy={cy - ry * 1.08} r={6} fill={a.brim} />
        </g>
      );
    case "mustache":
      return <path d={`M${turn * 1.1 - 26} ${cy + ry * 0.44}Q${turn * 1.1 - 12} ${cy + ry * 0.3} ${turn * 1.1} ${cy + ry * 0.38}Q${turn * 1.1 + 12} ${cy + ry * 0.3} ${turn * 1.1 + 26} ${cy + ry * 0.44}Q${turn * 1.1} ${cy + ry * 0.5} ${turn * 1.1 - 26} ${cy + ry * 0.44}Z`} fill={a.color} />;
    case "pencil":
      return (
        <g transform={`translate(${rx - 4 - turn * 0.6} ${cy - 10}) rotate(-62)`}>
          <rect x={-6} y={-46} width={12} height={78} rx={3} fill={a.color} />
          <path d="M-6 32L0 46L6 32Z" fill="#F2D5A8" />
          <path d="M-2 42L0 46L2 42Z" fill={c.ink} />
          <rect x={-6} y={-52} width={12} height={8} rx={2} fill="#E58F7F" />
        </g>
      );
    default:
      return null;
  }
};

export type FaceState = { face: FaceParams; blink: number; look: { px: number; py: number; turn: number }; mouth: MouthShape | null; yaw?: number };

/** Head in head space (top of the neck at 0,0): hair back, ears, face, features, hair front, accessories. */
export const Head: React.FC<{ p: Proportions; c: Palette; head: HeadSpec; hair: HairSpec; accessories: Accessory[]; state: FaceState; hairLag: number }> = ({
  p,
  c,
  head,
  hair,
  accessories,
  state,
  hairLag,
}) => {
  const rx = p.headRx;
  const ry = p.headRy;
  const cy = -ry * 0.9;
  const g = { rx, ry, cy };
  const f = state.face;
  const turn = state.look.turn;
  const es = (head.eyeSize ?? 1) * f.eyeScale;
  const ex = rx * 0.39;
  const ey = cy + ry * 0.1;
  const lid = clamp01(Math.max(f.lidTop, state.blink));
  const gx = clamp(state.look.px + f.gazeX, -7, 7);
  const gy = clamp(state.look.py + f.gazeY, -6, 6);
  const bw = 5.5 * (head.browWeight ?? 1);
  const scale = rx / 78;
  const ear = accessories.find((a): a is Extract<Accessory, { kind: "earrings" }> => a.kind === "earrings");
  // 3/4 turn: features slide toward the facing side, the far eye/brow foreshorten, the head's back
  // (hair) shows on the other side, the far ear hides behind the cheek.
  const yaw = clamp(state.yaw ?? 0, -1.1, 1.1);
  const ay = Math.abs(yaw);
  const fx = turn + yaw * rx * 0.34; // feature shift
  const faceShift = yaw * rx * 0.07;
  const eyeX = (sd: number) => sd * ex * (sd * yaw > 0 ? 1 - 0.22 * ay : 1 - 0.06 * ay) + (sd * yaw > 0 ? yaw * 4 : 0);
  const eyeSX = (sd: number) => (sd * yaw > 0 ? 1 - 0.32 * ay : 1 + 0.04 * ay);

  return (
    <g>
      <g transform={`rotate(${hairLag} 0 ${cy})`}>
        <g transform={`translate(${-yaw * rx * 0.1} 0)`}>
          <HairBack hair={hair} g={g} yaw={yaw} />
        </g>
      </g>
      {/* Ears: the near one slides toward the cheek, the far one tucks behind the face. */}
      {[-1, 1].map((sd) => {
        const far = sd * yaw > 0;
        const x = sd * rx * 0.97 + Math.max(0, -sd * turn) * 0.5 * sd * -1 + (far ? -sd * ay * rx * 0.25 : -sd * ay * rx * 0.05);
        return <ellipse key={sd} cx={x} cy={cy + 8} rx={13 * (far ? 1 - 0.5 * ay : 1)} ry={19} fill={c.skinShade} opacity={far ? clamp01(1 - ay * 1.5) : 1} />;
      })}
      <g transform={`translate(${faceShift} 0)`}>
      <path d={facePath(head.shape, g)} fill={c.skin} />
      {/* Jaw shade on the side away from the light. */}
      <path d={`M${rx * 0.2} ${cy + ry * 0.92}Q${rx * 0.85} ${cy + ry * 0.7} ${rx * 0.98} ${cy + ry * 0.1}Q${rx * 0.9} ${cy + ry * 0.62} ${rx * 0.2} ${cy + ry * 0.92}Z`} fill={c.skinShade} opacity={0.35} />
      {ear &&
        [-1, 1].map((sd) => {
          const far = sd * yaw > 0;
          return (
            <circle key={sd} cx={sd * rx * 0.98 - sd * ay * rx * (far ? 0.3 : 0.05) - faceShift} cy={cy + 32} r={6} fill="none" stroke={ear.color} strokeWidth={3.5} opacity={far ? clamp01(1 - ay * 1.6) : 1} />
          );
        })}

      <g transform={`translate(${fx} 0)`}>
        {/* Blush. */}
        {[-1, 1].map((sd) => (
          <ellipse key={sd} cx={sd * rx * 0.6 * eyeSX(sd)} cy={cy + ry * 0.4} rx={17 * eyeSX(sd)} ry={10} fill={c.blush} opacity={clamp01(f.blush) * 0.75} />
        ))}
        {head.freckles &&
          [-1, 1].map((sd) =>
            [0, 1, 2].map((i) => <circle key={`${sd}${i}`} cx={sd * (rx * 0.5 + i * 7)} cy={cy + ry * 0.28 + (i % 2) * 6} r={2.2} fill={c.skinDeep} opacity={0.6} />),
          )}

        {/* Eyes: dark ovals with a highlight; lids are skin shapes that close over them. */}
        {[-1, 1].map((sd) => {
          const x = eyeX(sd);
          const erx = 8.2 * es * eyeSX(sd);
          const ery = 10.8 * es;
          const edge = ey - 15 + 29 * lid;
          const low = ey + 15 - 25 * clamp01(f.lidBottom);
          return (
            <g key={sd}>
              <ellipse cx={x + gx} cy={ey + gy} rx={erx} ry={ery} fill={c.ink} />
              <circle cx={x + gx + 2.6} cy={ey + gy - 4} r={2.6} fill={c.light} opacity={lid < 0.6 ? 1 : 0} />
              {f.lidBottom > 0.04 && <path d={`M${x - 14} ${ey + 18}V${ey + 14}Q${x} ${low - 8} ${x + 14} ${ey + 14}V${ey + 18}Z`} fill={c.skin} />}
              {lid > 0.04 && (
                <>
                  <path d={`M${x - 14} ${ey - 18}H${x + 14}V${edge}Q${x} ${edge + 3} ${x - 14} ${edge}Z`} fill={c.skin} />
                  <path d={`M${x - 12} ${edge}Q${x} ${edge + 3 + lid * 2} ${x + 12} ${edge}`} stroke={c.ink} strokeWidth={4} strokeLinecap="round" fill="none" opacity={clamp01((lid - 0.08) * 6)} />
                  {head.lashes && <path d={`M${x + sd * 12} ${edge}l${sd * 5} -4`} stroke={c.ink} strokeWidth={3} strokeLinecap="round" opacity={clamp01((lid - 0.08) * 6)} />}
                </>
              )}
              {head.lashes && lid <= 0.04 && <path d={`M${x + sd * 7} ${ey - ery + 1}l${sd * 6} -4`} stroke={c.ink} strokeWidth={3} strokeLinecap="round" />}
              {head.wrinkles && <path d={`M${x + sd * 20} ${ey - 2}l${sd * 7} -3M${x + sd * 20} ${ey + 5}l${sd * 7} 2`} stroke={c.skinShade} strokeWidth={2.5} strokeLinecap="round" />}
            </g>
          );
        })}

        {/* Brows. */}
        {[-1, 1].map((sd) => {
          const x = eyeX(sd);
          const bs = eyeSX(sd);
          const base = ey - 26 - f.browY - (sd < 0 ? f.browAsym * 8 : -f.browAsym * 1.5);
          const inner = base - f.browTilt * (f.browTilt > 0 ? 11 : 7);
          const outer = base + f.browTilt * (f.browTilt > 0 ? 5 : 2.5);
          const xi = x - sd * 11 * bs;
          const xo = x + sd * 13 * bs;
          // Worry flattens the arch into a slanted line (inner end up).
          const arch = Math.min(inner, outer) - 5 * (1 - clamp01(f.browTilt) * 0.8);
          return <path key={sd} d={`M${xi} ${inner}Q${x} ${arch} ${xo} ${outer}`} stroke={c.ink} strokeWidth={bw} strokeLinecap="round" fill="none" />;
        })}

        {/* Nose. */}
        <g transform={`translate(${turn * 0.25 + yaw * rx * 0.16} 0) scale(${yaw < -0.2 ? -1 : 1} 1)`}>
          {(head.nose ?? "curve") === "curve" && <path d={`M4 ${cy + ry * 0.2}Q13 ${cy + ry * 0.36} -2 ${cy + ry * 0.41}`} stroke={c.skinDeep} strokeWidth={4} strokeLinecap="round" fill="none" />}
          {head.nose === "button" && <ellipse cx={1} cy={cy + ry * 0.36} rx={8} ry={6} fill={c.skinShade} />}
          {head.nose === "long" && <path d={`M2 ${cy + ry * 0.1}Q14 ${cy + ry * 0.38} -4 ${cy + ry * 0.43}M-10 ${cy + ry * 0.4}q3 3 6 2`} stroke={c.skinDeep} strokeWidth={4} strokeLinecap="round" fill="none" />}
        </g>
        {head.wrinkles && (
          <path d={`M${-rx * 0.42} ${cy + ry * 0.36}Q${-rx * 0.48} ${cy + ry * 0.52} ${-rx * 0.4} ${cy + ry * 0.64}M${rx * 0.42} ${cy + ry * 0.36}Q${rx * 0.48} ${cy + ry * 0.52} ${rx * 0.4} ${cy + ry * 0.64}`} stroke={c.skinShade} strokeWidth={3} strokeLinecap="round" fill="none" />
        )}

        {/* Mouth: viseme while speaking, expression otherwise. */}
        <g transform={`translate(${f.mouthX + turn * 0.2 - yaw * rx * 0.03} ${cy + ry * 0.6}) scale(${1 - 0.14 * ay} 1)`}>
          <Mouth
            c={c}
            scale={scale}
            smile={state.mouth && f.smile > 0 ? f.smile * 0.6 : f.smile}
            shape={
              state.mouth
                ? { ...state.mouth, open: clamp01(state.mouth.open + f.open * 0.3), pressed: Math.max(state.mouth.pressed, 0) }
                : { open: f.open, wide: f.wide, round: f.round, teeth: f.teeth, tongue: f.open > 0.5 ? 0.3 : 0, bite: 0, pressed: f.pressed }
            }
          />
        </g>
      </g>

      <g transform={`rotate(${hairLag * 0.4} 0 ${cy})`}>
        <HairFront hair={hair} g={g} shift={turn + yaw * rx * 0.3} />
      </g>
      {accessories.map((a, i) => (
        <AccessoryFront key={i} a={a} g={g} eyes={{ x: ex * (1 - 0.12 * ay), y: ey }} turn={fx} c={c} />
      ))}
      </g>
    </g>
  );
};
