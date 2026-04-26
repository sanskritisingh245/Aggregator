import type { Token } from "../lib/types";
import { formatPct, formatUsd } from "../lib/format";
import { Sparkline } from "./Sparkline";

interface Props {
  tokens: Token[];
  limit?: number;
  onHover?: (address: string | null) => void;
  pinnedAddress?: string | null;
}

export function Movers({
  tokens,
  limit = 12,
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

  if (movers.length === 0) {
    return (
      <div className="card rounded-xl border border-dashed border-rule px-6 py-8 text-center font-mono text-[11px] uppercase tracking-[0.22em] text-ink-mute">
        awaiting Δ data
      </div>
    );
  }

  return (
    <div className="-mx-2 px-2">
      <div className="no-bar flex gap-2 overflow-x-auto pb-1">
        {movers.map((t, i) => {
          const id = t.address ?? `${t.symbol}-${t.source}-${i}`;
          return (
            <Chip
              key={`mover-${id}`}
              token={t}
              rank={i + 1}
              pinned={pinnedAddress != null && pinnedAddress === t.address}
              onHover={onHover}
            />
          );
        })}
      </div>
    </div>
  );
}

function Chip({
  token,
  rank,
  pinned,
  onHover,
}: {
  token: Token;
  rank: number;
  pinned: boolean;
  onHover?: (a: string | null) => void;
}) {
  const change = token.priceChange24h ?? 0;
  const up = change >= 0;

  return (
    <article
      onMouseEnter={() => token.address && onHover?.(token.address)}
      onMouseLeave={() => onHover?.(null)}
      className={`tile relative flex w-40 shrink-0 flex-col gap-1.5 rounded-xl border px-3 py-2.5 transition ${
        pinned ? "border-accent/60" : "border-rule hover:border-rule-strong"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] tabular-nums text-ink-mute">
          {String(rank).padStart(2, "0")}
        </span>
        <span className="truncate font-sans text-[13px] font-semibold tracking-tight text-ink">
          {token.symbol.toUpperCase()}
        </span>
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[12px] tabular-nums text-ink-2">
          {formatUsd(token.price)}
        </span>
        <span
          className={`font-mono text-[11px] font-semibold tabular-nums ${
            up ? "text-up" : "text-down"
          }`}
        >
          {up ? "▲" : "▼"} {formatPct(change)}
        </span>
      </div>

      <div className="-mx-1 mt-0.5">
        <Sparkline
          seedKey={token.address ?? `${token.symbol}-${token.source}`}
          trend={token.priceChange24h}
          width={144}
          height={22}
          points={22}
          thickness={1.4}
        />
      </div>
    </article>
  );
}
