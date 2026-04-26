import type { Token } from "../lib/types";
import { formatUsd } from "../lib/format";

interface Props {
  tokens: Token[];
  visibleCount: number;
}

export function Stats({ tokens, visibleCount }: Props) {
  const sumVol = tokens.reduce((a, t) => a + (t.volume24h ?? 0), 0);
  const sumLiq = tokens.reduce((a, t) => a + (t.liquidity ?? 0), 0);

  const movers = tokens
    .filter((t) => typeof t.priceChange24h === "number")
    .sort((a, b) => Math.abs(b.priceChange24h ?? 0) - Math.abs(a.priceChange24h ?? 0));
  const top = movers[0];
  const topPct = top?.priceChange24h ?? 0;
  const topUp = topPct >= 0;

  return (
    <section className="card grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-rule lg:grid-cols-4">
      <Tile label="Tracked" value={tokens.length.toLocaleString()} sub={`${visibleCount} on this page`} />
      <Tile label="24h Volume" value={formatUsd(sumVol)} sub="across sources" />
      <Tile label="Liquidity" value={formatUsd(sumLiq)} sub="DEX pools" />
      <Tile
        label="Top Mover"
        value={top ? top.symbol.toUpperCase() : "—"}
        sub={top ? `${topUp ? "▲" : "▼"} ${Math.abs(topPct).toFixed(2)}%` : "no data"}
        subTone={top ? (topUp ? "up" : "down") : undefined}
        markAccent
      />
    </section>
  );
}

function Tile({
  label,
  value,
  sub,
  subTone,
  markAccent,
}: {
  label: string;
  value: string;
  sub: string;
  subTone?: "up" | "down";
  markAccent?: boolean;
}) {
  const subColor =
    subTone === "up" ? "text-up" : subTone === "down" ? "text-down" : "text-ink-mute";
  return (
    <div className="tile px-5 py-5">
      <div className="flex items-center gap-2">
        {markAccent && <span className="block h-1 w-1 rounded-full bg-accent" />}
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
          {label}
        </span>
      </div>
      <div className="mt-2 font-mono text-[26px] font-semibold tabular-nums leading-none text-ink">
        {value}
      </div>
      <div className={`mt-2 truncate font-mono text-[11px] tabular-nums ${subColor}`}>
        {sub}
      </div>
    </div>
  );
}
