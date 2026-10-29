import type { ReactNode } from "react";
import { Canvas } from "../components/Layout";
import { Backdrop, type BackdropShape } from "../kit/Backdrop";
import { Camera, Parallax, type CameraKey } from "../kit/Camera";
import { Headline, PopWords } from "../kit/Words";
import { colors, display, eyebrow as eyebrowStyle } from "../tokens";

export const HEAD_TOP = 168;
export const HEAD_SIZE = 104;
export const PHONE = { left: 470, top: 590, width: 540, height: 1040 };

/** Shared scene frame: background, parallax backdrop, eased camera and the headline block. */
export const Shell: React.FC<{
  background: string;
  dark?: boolean;
  camera: CameraKey[];
  shapes?: BackdropShape[];
  /** Optional small pre-title. promo does not use it (headline only). */
  eyebrow?: string;
  lines: readonly string[];
  highlight?: readonly string[];
  support?: string;
  supportAt?: number;
  headAt?: number;
  children?: ReactNode;
}> = ({ background, dark, camera, shapes = [], eyebrow, lines, highlight = [], support, supportAt = 40, headAt = 6, children }) => {
  return (
    <Canvas background={background} dark={dark}>
      <Camera keys={camera}>
        <Backdrop shapes={shapes} />
        <Parallax depth={0.55}>
          {eyebrow && (
            <div style={{ position: "absolute", left: 80, top: HEAD_TOP - 52 }}>
              <div style={{ ...eyebrowStyle, fontSize: 28, color: dark ? colors.accent : colors.primary }}><PopWords text={eyebrow} start={headAt} stagger={2} /></div>
            </div>
          )}
          <div style={{ position: "absolute", left: 80, right: 60, top: HEAD_TOP, ...display, fontSize: HEAD_SIZE, color: dark ? colors.paper : colors.ink }}>
            <Headline lines={lines} start={headAt + 2} highlight={[...highlight]} highlightColor={dark ? colors.accent : colors.primary} />
          </div>
          {support && (
            <div style={{ position: "absolute", left: 82, right: 80, top: HEAD_TOP + lines.length * HEAD_SIZE * 1.02 + 18, fontSize: 44, lineHeight: 1.2, fontWeight: 500, color: dark ? colors.primarySoft : colors.inkSoft }}>
              <PopWords text={support} start={supportAt} stagger={2} />
            </div>
          )}
        </Parallax>
        {children}
      </Camera>
    </Canvas>
  );
};
