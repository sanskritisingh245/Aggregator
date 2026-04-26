import type { Token } from "../lib/types";
import { formatPct, formatUsd } from "../lib/format";
import { Sparkline } from "./Sparkline";

interface Props {
  tokens: Token[];
  limit?: number;
  onHover?: (address: string | null) => void;
  pinnedAddress?: string | null;
}

export function MoversRail({
  tokens,
  limit = 8,
  onHover,
  pinnedAddress,
}: Props) {
  const withChange = tokens.filter((t) => typeof t.priceChange24h === "number");
  const movers = [...withChange]
    .sort(
      (a, b) =>
        Math.abs(b.priceChange24h ?? 0) - Math.abs(a.priceChange24h ?? 0),
    )
    .slice(0, limit);

  return (
    <article className="card flex h-full flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b border-rule px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <h3 className="font-display text-[18px] font-semibold tracking-tight text-ink">
            Top movers
          </h3>
        </div>
        <span className="font-sans text-[12px] text-ink-mute">
          24h
        </span>
      </header>

      {movers.length === 0 ? (
        <MoversRailLoading rows={limit} />
      ) : (
        <ul className="flex-1 divide-y divide-rule">
          {movers.map((t, i) => {
            const id = t.address ?? `${t.symbol}-${t.source}-${i}`;
            const pinned = pinnedAddress != null && pinnedAddress === t.address;
            return (
              <Row
                key={`mover-${id}`}
                token={t}
                rank={i + 1}
                index={i}
                pinned={pinned}
                onHover={onHover}
              />
            );
          })}
        </ul>
      )}
    </article>
  );
}

function Row({
  token,
  rank,
  index,
  pinned,
  onHover,
}: {
  token: Token;
  rank: number;
  index: number;
  pinned: boolean;
  onHover?: (a: string | null) => void;
}) {
  const change = token.priceChange24h ?? 0;
  const up = change >= 0;
  const seedKey = token.address ?? `${token.symbol}-${token.source}`;

  return (
    <li
      onMouseEnter={() => token.address && onHover?.(token.address)}
      onMouseLeave={() => onHover?.(null)}
      style={{ ["--i" as string]: index }}
      className={`row-mount row-lift relative grid grid-cols-[28px_minmax(0,1fr)_60px] items-center gap-2.5 px-5 py-2.5 ${
        pinned ? "bg-surface-2" : ""
      }`}
    >
      {pinned && <span className="absolute inset-y-0 left-0 w-0.5 bg-accent" />}

      <span className="font-mono text-[10px] tabular-nums text-rule-strong">
        {String(rank).padStart(2, "0")}
      </span>

      <div className="min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate font-sans text-[13px] font-semibold tracking-tight text-ink">
            {token.symbol.toUpperCase()}
          </span>
          <span
            className={`shrink-0 font-mono text-[12px] font-semibold tabular-nums ${
              up ? "text-up" : "text-down"
            }`}
          >
            {up ? "▲" : "▼"} {formatPct(change)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2 font-mono text-[10px] tabular-nums text-ink-mute">
          <span className="truncate">{formatUsd(token.price)}</span>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <Sparkline
          seedKey={seedKey}
          trend={token.priceChange24h}
          width={56}
          height={20}
          points={20}
          thickness={1.4}
        />
      </div>
    </li>
  );
}

/**
 * Loading state — skeleton rows with the same column structure as the live
 * list, so layout doesn't jump when data lands. A scanning caption with an
 * indeterminate progress bar sits above the rows for clear feedback.
 */
function MoversRailLoading({ rows }: { rows: number }) {
  // Slight width variation per row so the skeleton doesn't look mechanical
  const widths = [
    { sym: "w-12", delta: "w-10", price: "w-16", spark: "w-14" },
    { sym: "w-14", delta: "w-12", price: "w-14", spark: "w-12" },
    { sym: "w-10", delta: "w-10", price: "w-20", spark: "w-14" },
    { sym: "w-16", delta: "w-12", price: "w-16", spark: "w-10" },
    { sym: "w-12", delta: "w-10", price: "w-14", spark: "w-14" },
    { sym: "w-14", delta: "w-12", price: "w-18", spark: "w-12" },
    { sym: "w-10", delta: "w-10", price: "w-16", spark: "w-14" },
    { sym: "w-12", delta: "w-12", price: "w-14", spark: "w-10" },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-rule px-5 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="font-sans text-[12px] text-ink-mute">Loading movers</span>
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

      <ul className="flex-1 divide-y divide-rule">
        {Array.from({ length: rows }).map((_, i) => {
          const w = widths[i % widths.length];
          return (
            <li
              key={`skel-${i}`}
              style={{ ["--i" as string]: i }}
              className="row-mount relative grid grid-cols-[28px_minmax(0,1fr)_60px] items-center gap-2.5 px-5 py-2.5"
            >
              <span className="font-mono text-[10px] tabular-nums text-rule-strong">
                {String(i + 1).padStart(2, "0")}
              </span>

              <div className="min-w-0 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className={`shimmer block h-3 ${w.sym}`} />
                  <span className={`shimmer block h-2.5 ${w.delta}`} />
                </div>
                <span className={`shimmer block h-2 ${w.price}`} />
              </div>

              <div className="flex items-center justify-end">
                <span className={`shimmer block h-2 ${w.spark}`} />
              </div>
            </li>
          );
        })}
      </ul>

    </div>
  );
}
