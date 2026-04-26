import { useEffect, useRef, useState } from "react";
import type { Token } from "../lib/types";
import { formatUsd } from "../lib/format";
import type { ConnectionState } from "../hooks/useLiveSocket";

interface Props {
  tokens: Token[];
  status: ConnectionState;
}

function bigUsd(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n === 0) return "$0";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return formatUsd(n);
}

export function Pulse({ tokens, status }: Props) {
  const sumVol = tokens.reduce((a, t) => a + (t.volume24h ?? 0), 0);
  const sumLiq = tokens.reduce((a, t) => a + (t.liquidity ?? 0), 0);
  const withChange = tokens.filter((t) => typeof t.priceChange24h === "number");
  const avgChange =
    withChange.length === 0
      ? null
      : withChange.reduce((a, t) => a + (t.priceChange24h ?? 0), 0) /
        withChange.length;
  const upCount = withChange.filter((t) => (t.priceChange24h ?? 0) > 0).length;
  const downCount = withChange.filter((t) => (t.priceChange24h ?? 0) < 0).length;
  const sourcesCount = new Set(tokens.map((t) => t.source)).size;
  const avgTone =
    avgChange == null ? "text-ink-2" : avgChange >= 0 ? "text-up" : "text-down";

  return (
    <section className="card regmarks overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-5 py-3">
        <div className="flex items-center gap-3">
          <h3 className="font-display text-[15px] font-semibold tracking-tight text-ink">
            Market summary
          </h3>
          <span className="hidden font-sans text-[12px] text-ink-mute sm:inline">
            Updated every 30 seconds
          </span>
        </div>
        <span className="flex items-center gap-2 font-mono text-[11px] text-ink-mute">
          <span
            className={`live-pulse block h-1.5 w-1.5 ${
              status === "open" ? "bg-accent" : status === "connecting" ? "bg-ink-2" : "bg-down"
            }`}
          />
          {status === "open" ? "Live" : status === "connecting" ? "Connecting" : "Offline"}
        </span>
      </header>

      <div className="grid grid-cols-2 gap-px bg-rule lg:grid-cols-5">
        <Tile index={0} label="Tracked" value={tokens.length.toLocaleString()} sub={`${sourcesCount} sources`} />
        <Tile index={1} label="24h volume" value={bigUsd(sumVol)} sub="all feeds" />
        <Tile index={2} label="Liquidity" value={bigUsd(sumLiq)} sub="DEX pools" />
        <Tile
          index={3}
          label="Avg 24h Δ"
          value={avgChange == null ? "—" : `${avgChange >= 0 ? "+" : ""}${avgChange.toFixed(2)}%`}
          sub={withChange.length === 0 ? "no data" : `${upCount} up · ${downCount} down`}
          valueClass={avgTone}
        />
        <Tile
          index={4}
          label="Top mover"
          value={topMoverSymbol(withChange) ?? "—"}
          sub={topMoverSub(withChange) ?? "no data"}
        />
      </div>
    </section>
  );
}

function Tile({
  index,
  label,
  value,
  sub,
  valueClass = "text-ink",
}: {
  index: number;
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}) {
  const [flashKey, setFlashKey] = useState(0);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current !== value) {
      setFlashKey((k) => k + 1);
      prev.current = value;
    }
  }, [value]);

  return (
    <div className="tile tile-mount p-5" style={{ ["--i" as string]: index }}>
      <div className="font-sans text-[12px] text-ink-mute">
        {label}
      </div>
      <div
        key={flashKey}
        className={`value-flash mt-1.5 inline-block font-display text-[26px] font-semibold leading-none tracking-tight tabular-nums ${valueClass}`}
      >
        {value}
      </div>
      {sub && (
        <div className="mt-1.5 truncate font-sans text-[12px] tabular-nums text-ink-mute">
          {sub}
        </div>
      )}
    </div>
  );
}

function topMoverSymbol(withChange: Token[]) {
  if (withChange.length === 0) return null;
  return [...withChange]
    .sort(
      (a, b) =>
        Math.abs(b.priceChange24h ?? 0) - Math.abs(a.priceChange24h ?? 0),
    )[0]
    ?.symbol.toUpperCase();
}

function topMoverSub(withChange: Token[]) {
  if (withChange.length === 0) return null;
  const t = [...withChange].sort(
    (a, b) =>
      Math.abs(b.priceChange24h ?? 0) - Math.abs(a.priceChange24h ?? 0),
  )[0];
  if (!t) return null;
  const v = t.priceChange24h ?? 0;
  return `${v >= 0 ? "▲" : "▼"} ${Math.abs(v).toFixed(2)}%`;
}
