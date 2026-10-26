// Tiny SVG rasterizer for tests (no dependencies): fills only (strokes ignored), nonzero winding,
// <g>/<path>/<circle>/<ellipse>/<rect>, transforms translate/rotate/scale/matrix, opacity.
// Painter's order: the returned buffer holds, per pixel, the fill color of the topmost shape.

const mul = (a, b) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
const ID = [1, 0, 0, 1, 0, 0];
const ap = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

const parseTransform = (s) => {
  let m = ID;
  if (!s) return m;
  for (const [, fn, args] of s.matchAll(/(\w+)\s*\(([^)]*)\)/g)) {
    const a = args.split(/[\s,]+/).filter(Boolean).map(Number);
    if (fn === "translate") m = mul(m, [1, 0, 0, 1, a[0], a[1] ?? 0]);
    else if (fn === "scale") m = mul(m, [a[0], 0, 0, a[1] ?? a[0], 0, 0]);
    else if (fn === "rotate") {
      const r = (a[0] * Math.PI) / 180;
      const c = Math.cos(r);
      const sn = Math.sin(r);
      const cx = a[1] ?? 0;
      const cy = a[2] ?? 0;
      m = mul(m, [1, 0, 0, 1, cx, cy]);
      m = mul(m, [c, sn, -sn, c, 0, 0]);
      m = mul(m, [1, 0, 0, 1, -cx, -cy]);
    } else if (fn === "matrix") m = mul(m, a);
  }
  return m;
};

const N = 14;
const pathPolys = (d) => {
  const toks = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g) ?? [];
  const polys = [];
  let cur = [];
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  let i = 0;
  let cmd = "M";
  const num = () => Number(toks[i++]);
  const flush = () => {
    if (cur.length > 2) polys.push(cur);
    cur = [];
  };
  while (i < toks.length) {
    if (/[a-zA-Z]/.test(toks[i])) cmd = toks[i++];
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    const ox = rel ? x : 0;
    const oy = rel ? y : 0;
    if (C === "Z") {
      x = sx;
      y = sy;
      flush();
      continue;
    }
    if (C === "M") {
      flush();
      x = ox + num();
      y = oy + num();
      sx = x;
      sy = y;
      cur.push([x, y]);
      cmd = rel ? "l" : "L";
    } else if (C === "L") {
      x = ox + num();
      y = oy + num();
      cur.push([x, y]);
    } else if (C === "H") {
      x = (rel ? x : 0) + num();
      cur.push([x, y]);
    } else if (C === "V") {
      y = (rel ? y : 0) + num();
      cur.push([x, y]);
    } else if (C === "C") {
      const p = [ox + num(), oy + num(), ox + num(), oy + num(), ox + num(), oy + num()];
      for (let k = 1; k <= N; k++) {
        const t = k / N;
        const u = 1 - t;
        cur.push([u * u * u * x + 3 * u * u * t * p[0] + 3 * u * t * t * p[2] + t * t * t * p[4], u * u * u * y + 3 * u * u * t * p[1] + 3 * u * t * t * p[3] + t * t * t * p[5]]);
      }
      x = p[4];
      y = p[5];
    } else if (C === "Q") {
      const p = [ox + num(), oy + num(), ox + num(), oy + num()];
      for (let k = 1; k <= N; k++) {
        const t = k / N;
        const u = 1 - t;
        cur.push([u * u * x + 2 * u * t * p[0] + t * t * p[2], u * u * y + 2 * u * t * p[1] + t * t * p[3]]);
      }
      x = p[2];
      y = p[3];
    } else if (C === "A") {
      let rx = Math.abs(num());
      let ry = Math.abs(num());
      const phi = (num() * Math.PI) / 180;
      const fa = num();
      const fs = num();
      const x2 = ox + num();
      const y2 = oy + num();
      // SVG F.6.5 endpoint → center.
      const cp = Math.cos(phi);
      const sp = Math.sin(phi);
      const dx = (x - x2) / 2;
      const dy = (y - y2) / 2;
      const x1p = cp * dx + sp * dy;
      const y1p = -sp * dx + cp * dy;
      const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
      if (lam > 1) {
        rx *= Math.sqrt(lam);
        ry *= Math.sqrt(lam);
      }
      const num2 = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
      const co = (fa === fs ? -1 : 1) * Math.sqrt(Math.max(0, num2 / (rx * rx * y1p * y1p + ry * ry * x1p * x1p)));
      const cxp = (co * rx * y1p) / ry;
      const cyp = (-co * ry * x1p) / rx;
      const cx = cp * cxp - sp * cyp + (x + x2) / 2;
      const cy = sp * cxp + cp * cyp + (y + y2) / 2;
      const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
      const t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
      let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
      if (!fs && dt > 0) dt -= 2 * Math.PI;
      if (fs && dt < 0) dt += 2 * Math.PI;
      const n = 32;
      for (let k = 1; k <= n; k++) {
        const t = t1 + (dt * k) / n;
        cur.push([cx + rx * Math.cos(t) * cp - ry * Math.sin(t) * sp, cy + rx * Math.cos(t) * sp + ry * Math.sin(t) * cp]);
      }
      x = x2;
      y = y2;
    } else throw new Error(`raster: unsupported path command ${cmd}`);
  }
  flush();
  return polys;
};

const ellipsePoly = (cx, cy, rx, ry) => [Array.from({ length: 48 }, (_, k) => [cx + rx * Math.cos((k / 48) * 2 * Math.PI), cy + ry * Math.sin((k / 48) * 2 * Math.PI)])];

const attrs = (s) => {
  const o = {};
  for (const [, k, v] of s.matchAll(/([\w-]+)="([^"]*)"/g)) o[k] = v.replace(/&quot;/g, '"');
  return o;
};

/** SVG markup → list of { fill, polys } in canvas space, in paint order. */
export const shapesOf = (svg) => {
  const out = [];
  const stack = [{ m: ID, op: 1 }];
  for (const [, close, tag, body, self] of svg.matchAll(/<(\/?)(\w+)([^>]*?)(\/?)>/g)) {
    if (close) {
      if (tag === "g" || tag === "svg") stack.pop();
      continue;
    }
    const a = attrs(body);
    const top = stack[stack.length - 1];
    const m = mul(top.m, parseTransform(a.transform));
    const op = top.op * Number(a.opacity ?? 1);
    if (tag === "g" || tag === "svg") {
      if (!self) stack.push({ m, op });
      continue;
    }
    const fill = a.fill ?? "#000";
    if (fill === "none" || op * Number(a["fill-opacity"] ?? 1) < 0.5) continue;
    let polys;
    if (tag === "path") polys = pathPolys(a.d);
    else if (tag === "circle") polys = ellipsePoly(+a.cx || 0, +a.cy || 0, +a.r, +a.r);
    else if (tag === "ellipse") polys = ellipsePoly(+a.cx || 0, +a.cy || 0, +a.rx, +a.ry);
    else if (tag === "rect") {
      const x = +a.x || 0;
      const y = +a.y || 0;
      polys = [[[x, y], [x + +a.width, y], [x + +a.width, y + +a.height], [x, y + +a.height]]];
    } else continue;
    out.push({ fill: fill.toLowerCase(), polys: polys.map((pl) => pl.map(([px, py]) => ap(m, px, py))) });
  }
  return out;
};

/** Rasterize shapes over [x0, x0+w) × [y0, y0+h) at 1 px; returns { at(x, y) → fill | null, ... }. */
export const rasterize = (shapes, x0, y0, w, h) => {
  const buf = new Array(w * h).fill(null);
  for (const s of shapes) {
    for (let r = 0; r < h; r++) {
      const yy = y0 + r + 0.5;
      const xs = [];
      for (const pl of s.polys)
        for (let k = 0; k < pl.length; k++) {
          const [ax, ay] = pl[k];
          const [bx, by] = pl[(k + 1) % pl.length];
          if (ay <= yy === by <= yy) continue;
          xs.push([ax + ((yy - ay) / (by - ay)) * (bx - ax), by > ay ? 1 : -1]);
        }
      if (xs.length < 2) continue;
      xs.sort((p, q) => p[0] - q[0]);
      let wn = 0;
      for (let k = 0; k < xs.length - 1; k++) {
        wn += xs[k][1];
        if (wn === 0) continue;
        const c0 = Math.max(0, Math.ceil(xs[k][0] - x0 - 0.5));
        const c1 = Math.min(w - 1, Math.floor(xs[k + 1][0] - x0 - 0.5));
        for (let c = c0; c <= c1; c++) buf[r * w + c] = s.fill;
      }
    }
  }
  return { w, h, x0, y0, at: (x, y) => (x < x0 || y < y0 || x >= x0 + w || y >= y0 + h ? null : buf[(y - y0) * w + (x - x0)]) };
};
