import type { ReactNode } from "react";
import type { HoldRender } from "./types";

export type PhoneLook = {
  /** Case / frame colour. */
  body?: string;
  /** Screen background (front) and the light that shows on the screen edge in 3/4. */
  screen?: string;
  /** Back of the case (default: body). */
  back?: string;
  /** Camera / logo detail on the back. */
  detail?: string;
  /** What is on the screen (drawn in a 40 × 74 box centred at 0,0). Default: a few UI bars. */
  content?: ReactNode;
  /** Keep the phone upright on screen whatever the hand angle (default false: it follows the hand). */
  upright?: boolean;
  /** Extra screen brightness 0…1 (e.g. a tap flash). */
  glow?: number;
};

/**
 * A phone for `holdL` / `holdR` that turns with the hand: screen when the hand shows it to the
 * camera (`view` > 0), back and camera when it is turned toward the character (`view` < 0), with
 * the side of the case (and a sliver of lit screen) in 3/4. Fits the "hold" grip (~48 px wide).
 */
export const phoneProp =
  (o: PhoneLook = {}): HoldRender =>
  ({ worldAngle, view = 1 }) => {
    const body = o.body ?? "#22252B";
    const screen = o.screen ?? "#DDEFE6";
    const back = o.back ?? body;
    const detail = o.detail ?? "#5A606B";
    const side = 1 - Math.min(1, Math.abs(view)); // 0 face-on … 1 edge-on
    const rot = o.upright ? `rotate(${-worldAngle})` : "";
    const edgeW = 4 + side * 9;
    const front = view >= 0;
    return (
      <g transform={`${rot} translate(2 -4)`}>
        {/* Case side, on the far edge, wider the more it is turned. */}
        {side > 0.05 && <rect x={front ? 18 : -24 - edgeW + 6} y={-46} width={edgeW} height={92} rx={6} fill={detail} />}
        <rect x={-24} y={-48} width={48} height={96} rx={10} fill={front ? body : back} />
        {front ? (
          <>
            <rect x={-19} y={-41} width={38} height={80} rx={5} fill={screen} />
            {o.glow ? <rect x={-19} y={-41} width={38} height={80} rx={5} fill="#FFFFFF" opacity={Math.min(1, o.glow) * 0.55} /> : null}
            <g>
              {o.content ?? (
                <>
                  <rect x={-13} y={-30} width={26} height={6} rx={3} fill={body} opacity={0.35} />
                  <rect x={-13} y={-16} width={20} height={6} rx={3} fill={body} opacity={0.25} />
                  <rect x={-13} y={-2} width={26} height={6} rx={3} fill={body} opacity={0.25} />
                  <rect x={-13} y={16} width={26} height={12} rx={6} fill={body} opacity={0.55} />
                </>
              )}
            </g>
          </>
        ) : (
          <>
            {/* Lit screen edge seen past the case in 3/4 (the screen faces the character). */}
            {side > 0.15 && <rect x={22} y={-42} width={2 + side * 5} height={84} rx={2} fill={screen} opacity={0.9 * (o.glow ? 1 : 0.85)} />}
            <rect x={-17} y={-40} width={15} height={22} rx={6} fill={detail} />
            <circle cx={-12} cy={-34} r={4} fill={body} />
            <circle cx={-7} cy={-24} r={4} fill={body} />
            <circle cx={4} cy={8} r={6} fill={detail} opacity={0.7} />
          </>
        )}
      </g>
    );
  };
