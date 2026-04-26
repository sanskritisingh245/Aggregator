import type { Token } from "../lib/types";

interface Props {
  tokens: Token[];
  highlightedAddress?: string | null;
  onHover?: (address: string | null) => void;
  basisLabel: string;
}

const sourceTone: Record<Token["source"], string> = {
  dex: "var(--color-src-dex)",
  jupiter: "var(--color-src-jup)",
  coingecko: "var(--color-src-gko)",
};

function tierRadius(rank: number) {
  if (rank <= 12) return 150;
  if (rank <= 24) return 190;
  return 230;
}

export function RaceTrack({ tokens, highlightedAddress, onHover, basisLabel }: Props) {
  const ranked = tokens.slice(0, 36);
  const size = 620;
  const center = size / 2;

  if (ranked.length === 0) {
    return <RaceTrackLoading basisLabel={basisLabel} />;
  }

  return (
    <div className="race-wrap relative overflow-hidden">
      <svg viewBox={`0 0 ${size} ${size}`} className="race-svg" role="img" aria-label="Token rank map">
        <defs>
          <linearGradient id="trackStroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-rule-strong)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="var(--color-rule)" stopOpacity="0.3" />
          </linearGradient>
          <radialGradient id="hubGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--color-surface-3)" />
            <stop offset="70%" stopColor="var(--color-surface-2)" />
            <stop offset="100%" stopColor="var(--color-surface)" />
          </radialGradient>
          <filter id="glowAccent" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer rings — solid, gradient-stroked */}
        <circle cx={center} cy={center} r={230} fill="none" stroke="url(#trackStroke)" strokeWidth="2.2" />
        <circle cx={center} cy={center} r={190} fill="none" stroke="url(#trackStroke)" strokeWidth="1.8" />
        <circle cx={center} cy={center} r={150} fill="none" stroke="url(#trackStroke)" strokeWidth="1.4" />

        {/* Decorative dashed ring — static */}
        <circle
          cx={center}
          cy={center}
          r={108}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="1"
          strokeDasharray="2 8"
          opacity="0.45"
        />

        {/* Static outer tick ring */}
        <circle
          cx={center}
          cy={center}
          r={252}
          fill="none"
          stroke="var(--color-accent-2)"
          strokeWidth="1"
          strokeDasharray="1 12"
          opacity="0.28"
        />

        {/* Cardinal axis ticks — fixed reference */}
        {[0, 90, 180, 270].map((deg) => {
          const rad = (deg - 90) * (Math.PI / 180);
          const x1 = center + Math.cos(rad) * 232;
          const y1 = center + Math.sin(rad) * 232;
          const x2 = center + Math.cos(rad) * 248;
          const y2 = center + Math.sin(rad) * 248;
          return (
            <line
              key={deg}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="var(--color-rule-strong)"
              strokeWidth="1"
              opacity="0.65"
            />
          );
        })}

        {/* Token dots — staggered entrance via CSS variable --i */}
        {ranked.map((token, i) => {
          const rank = i + 1;
          const angle = (-Math.PI / 2) + ((i / ranked.length) * Math.PI * 2);
          const r = tierRadius(rank);
          const x = center + Math.cos(angle) * r;
          const y = center + Math.sin(angle) * r;
          const fill = sourceTone[token.source];
          const dotSize = rank <= 3 ? 8 : rank <= 12 ? 6 : 4.6;
          const isHighlight = highlightedAddress != null && token.address === highlightedAddress;

          return (
            <g
              key={`${token.address}-${token.source}-${i}`}
              className="race-dot"
              style={{ ["--i" as string]: i }}
              onMouseEnter={() => token.address && onHover?.(token.address)}
              onMouseLeave={() => onHover?.(null)}
            >
              {isHighlight && (
                <g className="race-replay">
                  {Array.from({ length: 5 }).map((_, t) => {
                    const trailAngle = angle - (t + 1) * 0.045;
                    const tx = center + Math.cos(trailAngle) * r;
                    const ty = center + Math.sin(trailAngle) * r;
                    return (
                      <circle
                        key={t}
                        cx={tx}
                        cy={ty}
                        r={Math.max(2, dotSize - (t + 2) * 0.9)}
                        fill={fill}
                        opacity={0.6 - t * 0.1}
                      />
                    );
                  })}
                </g>
              )}
              <circle
                cx={x}
                cy={y}
                r={dotSize + 2}
                fill={fill}
                opacity="0.16"
                filter={isHighlight ? "url(#glowAccent)" : undefined}
              />
              <circle cx={x} cy={y} r={dotSize} fill={fill} />
              {rank <= 12 && (
                <text
                  x={x + 10}
                  y={y - 9}
                  fill="var(--color-ink-2)"
                  className="race-label"
                >
                  {String(rank).padStart(2, "0")} {token.symbol.toUpperCase()}
                </text>
              )}
            </g>
          );
        })}

        {/* Center hub — gradient fill, with an inner orbiting reticle */}
        <circle
          cx={center}
          cy={center}
          r={70}
          fill="url(#hubGradient)"
          stroke="var(--color-rule-strong)"
          strokeWidth="1.5"
        />
        <circle
          cx={center}
          cy={center}
          r={62}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="0.6"
          strokeDasharray="1 4"
          opacity="0.6"
        />
        <circle cx={center} cy={center - 62} r={2} fill="var(--color-accent)" />
        <circle cx={center} cy={center + 62} r={2} fill="var(--color-accent-2)" />

        <text x={center} y={center - 4} textAnchor="middle" fill="var(--color-ink)" className="race-center-title">
          Market map
        </text>
        <text x={center} y={center + 16} textAnchor="middle" fill="var(--color-ink-mute)" className="race-center-sub">
          {basisLabel}
        </text>
      </svg>
    </div>
  );
}

/**
 * Loading state — same scaffolding as the live chart (rings, hub) so layout
 * doesn't jump when data lands. Static structure + a few placeholder dots
 * that fade gently. A small indeterminate progress bar sits below the chart.
 */
function RaceTrackLoading({ basisLabel }: { basisLabel: string }) {
  const size = 620;
  const center = size / 2;

  const ghostRings: Array<{ r: number; count: number }> = [
    { r: 150, count: 4 },
    { r: 190, count: 5 },
    { r: 230, count: 6 },
  ];
  const ghosts: Array<{ x: number; y: number; r: number; i: number }> = [];
  let gi = 0;
  ghostRings.forEach(({ r, count }) => {
    for (let k = 0; k < count; k++) {
      const a = -Math.PI / 2 + (k / count) * Math.PI * 2 + (gi * 0.21);
      ghosts.push({
        x: center + Math.cos(a) * r,
        y: center + Math.sin(a) * r,
        r: 4.6,
        i: gi++,
      });
    }
  });

  return (
    <div className="race-wrap relative overflow-hidden">
      <svg viewBox={`0 0 ${size} ${size}`} className="race-svg" role="img" aria-label="Loading market data">
        <defs>
          <linearGradient id="trackStrokeLoad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-rule-strong)" stopOpacity="0.7" />
            <stop offset="100%" stopColor="var(--color-rule)" stopOpacity="0.3" />
          </linearGradient>
          <radialGradient id="hubGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--color-surface-3)" />
            <stop offset="70%" stopColor="var(--color-surface-2)" />
            <stop offset="100%" stopColor="var(--color-surface)" />
          </radialGradient>
        </defs>

        {/* Concentric rings — same as live state */}
        <circle cx={center} cy={center} r={230} fill="none" stroke="url(#trackStrokeLoad)" strokeWidth="2.2" />
        <circle cx={center} cy={center} r={190} fill="none" stroke="url(#trackStrokeLoad)" strokeWidth="1.8" />
        <circle cx={center} cy={center} r={150} fill="none" stroke="url(#trackStrokeLoad)" strokeWidth="1.4" />

        {/* Placeholder dots — gently fade in/out */}
        {ghosts.map((g, idx) => (
          <circle
            key={`ghost-${idx}`}
            className="ghost-dot"
            style={{ ["--i" as string]: g.i }}
            cx={g.x}
            cy={g.y}
            r={g.r}
            fill="var(--color-rule-strong)"
          />
        ))}

        {/* Center hub */}
        <circle
          cx={center}
          cy={center}
          r={70}
          fill="url(#hubGradient)"
          stroke="var(--color-rule-strong)"
          strokeWidth="1.5"
        />

        <text x={center} y={center - 4} textAnchor="middle" fill="var(--color-ink)" className="race-center-title">
          Loading
        </text>
        <text x={center} y={center + 16} textAnchor="middle" fill="var(--color-ink-mute)" className="race-center-sub">
          {basisLabel}
        </text>
      </svg>

      {/* Loading caption with indeterminate progress bar */}
      <div className="px-2 pb-2 pt-1">
        <div className="flex items-center justify-between gap-3">
          <span className="font-sans text-[12px] text-ink-mute">Loading market data</span>
          <span className="font-sans text-[11px] text-ink-mute">Please wait</span>
        </div>
        <div className="mt-2 h-0.5 overflow-hidden rounded-[1px] bg-rule">
          <span
            aria-hidden
            className="block h-full w-[30%]"
            style={{
              background:
                "linear-gradient(90deg, transparent, var(--color-accent), transparent)",
              animation: "bar-slide 1.8s linear infinite",
            }}
          />
        </div>
      </div>
    </div>
  );
}
