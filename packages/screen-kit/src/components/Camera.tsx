import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { Cam } from '../geometry';

// Renders page-space children (W×H page) through a virtual camera. When s<1 the page is
// shown as a floating "window" card on the background (wide shot).
export const Camera: React.FC<{ cam: Cam; pageW: number; pageH: number; outW: number; outH: number; radius?: number; children: React.ReactNode }> = ({ cam, pageW, pageH, outW, outH, radius = 14, children }) => {
  const k = outW / pageW;
  const s = cam.s * k;
  const tx = outW / 2 - cam.cx * s;
  const ty = outH / 2 - cam.cy * s;
  // Rounded corners/shadow only matter when the page edge is visible (wide shot); fade them by scale.
  const edge = Math.max(0, Math.min(1, (1 - cam.s) / 0.04));
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute', left: 0, top: 0, width: pageW, height: pageH,
          transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${s})`,
          borderRadius: (radius * edge) / cam.s, overflow: 'hidden',
          boxShadow: edge > 0 ? `0 ${24 / cam.s}px ${60 / cam.s}px rgba(20,20,18,${0.16 * edge}), 0 0 0 ${1 / cam.s}px rgba(20,20,18,${0.10 * edge})` : 'none',
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};
