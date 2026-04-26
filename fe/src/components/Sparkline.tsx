import { useMemo } from "react";

interface Props {
  seedKey: string;
  trend: number | null; // priceChange24h percent
  width?: number;
  height?: number;
  points?: number;
  thickness?: number;
  withFill?: boolean;
}

// deterministic 0..1 PRNG seeded from a string
function makeRng(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return ((h >>> 0) % 1_000_000) / 1_000_000;
  };
}

export function Sparkline({
  seedKey,
  trend,
  width = 120,
  height = 32,
  points = 36,
  thickness = 1.5,
  withFill = false,
}: Props) {
  const safeSeed = typeof seedKey === "string" && seedKey.length > 0 ? seedKey : "x";
  const path = useMemo(() => {
    const rng = makeRng(safeSeed + ":" + (trend ?? 0).toFixed(2));
    const t = (trend ?? 0) / 100; // -1..+1 typical small
    // gentle drift toward final = trend, with some volatility
    const ys: number[] = [];
    let v = 0;
    for (let i = 0; i < points; i++) {
      const noise = (rng() - 0.5) * 0.18;
      const drift = (t * (i / (points - 1))) * 0.6;
      v = v * 0.82 + noise + drift * 0.05;
      ys.push(v);
    }
    // normalise
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const range = maxY - minY || 1;
    const padY = thickness + 1;
    const normY = ys.map((y) => height - padY - ((y - minY) / range) * (height - padY * 2));

    const stepX = width / (points - 1);
    const d = normY
      .map((y, i) => `${i === 0 ? "M" : "L"} ${(i * stepX).toFixed(2)} ${y.toFixed(2)}`)
      .join(" ");

    const fill = `${d} L ${width.toFixed(2)} ${height} L 0 ${height} Z`;
    return { d, fill, lastY: normY[normY.length - 1] ?? height / 2 };
  }, [safeSeed, trend, width, height, points, thickness]);

  const up = (trend ?? 0) >= 0;
  const stroke = trend == null ? "var(--color-ink-mute)" : up ? "var(--color-up)" : "var(--color-down)";
  const gradId = `spark-${up ? "u" : "d"}-${safeSeed.slice(0, 8)}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="block"
      aria-hidden="true"
    >
      {withFill && (
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
      )}
      {withFill && <path d={path.fill} fill={`url(#${gradId})`} />}
      <path
        d={path.d}
        fill="none"
        stroke={stroke}
        strokeWidth={thickness}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={trend == null ? 0.5 : 0.95}
        className="spark-draw"
        style={{ ["--len" as string]: width * 1.6 }}
      />
      {/* end-cap dot */}
      <circle
        cx={width - 1}
        cy={path.lastY}
        r={thickness + 0.5}
        fill={stroke}
      />
    </svg>
  );
}
