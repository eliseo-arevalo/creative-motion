import qrcode from "qrcode-generator";
import { useMemo } from "react";
import { colors } from "../tokens";

/**
 * Scannable QR code drawn as crisp SVG modules. `size` is the outer size including the white
 * quiet zone (`quiet` modules, 4 by spec); it is snapped down to a whole number of px per module.
 */
export const QrCode: React.FC<{ url: string; size?: number; quiet?: number; ecl?: "L" | "M" | "Q" | "H"; color?: string; background?: string }> = ({
  url,
  size = 460,
  quiet = 4,
  ecl = "M",
  color = colors.ink,
  background = "#FFFFFF",
}) => {
  const { n, d } = useMemo(() => {
    const qr = qrcode(0, ecl);
    qr.addData(url);
    qr.make();
    const count = qr.getModuleCount();
    let path = "";
    for (let r = 0; r < count; r++) for (let c = 0; c < count; c++) if (qr.isDark(r, c)) path += `M${c + quiet} ${r + quiet}h1v1h-1z`;
    return { n: count + quiet * 2, d: path };
  }, [url, quiet, ecl]);
  const px = Math.floor(size / n) * n;
  return (
    <svg width={px} height={px} viewBox={`0 0 ${n} ${n}`} shapeRendering="crispEdges" style={{ display: "block" }}>
      <rect width={n} height={n} fill={background} />
      <path d={d} fill={color} />
    </svg>
  );
};
