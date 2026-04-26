import { useEffect, useRef, useState } from "react";
import type { Token } from "../lib/types";
import { formatPct, formatUsd, shortAddress } from "../lib/format";
import { Sparkline } from "./Sparkline";
import { SourcePill } from "./SourcePill";

interface Props {
  tokens: Token[];
  baseRank: number;
  pinnedAddress: string | null;
  onHover: (address: string | null) => void;
}

export function Ledger({ tokens, baseRank, pinnedAddress, onHover }: Props) {
  return (
    <div className="card regmarks min-w-[1100px] overflow-hidden rounded-xl">
      <header className="grid grid-cols-[40px_280px_72px_120px_90px_120px_120px_120px_140px] items-center gap-3 border-b border-rule-strong bg-surface-2/80 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
        <span className="text-accent">№</span>
        <span>Token</span>
        <span>Src</span>
        <span className="text-right">Price</span>
        <span className="text-right">24h Δ</span>
        <span className="text-right">Volume</span>
        <span className="text-right">Mkt cap</span>
        <span className="text-right">Liquidity</span>
        <span className="text-right">7d trend</span>
      </header>

      <ul>
        {tokens.map((t, i) => {
          const id = t.address ?? `${t.symbol}-${t.source}-${baseRank + i}`;
          return (
            <Row
              key={id}
              token={t}
              rank={baseRank + i}
              pinned={pinnedAddress != null && pinnedAddress === t.address}
              onHover={onHover}
            />
          );
        })}
      </ul>
    </div>
  );
}

function Row({
  token,
  rank,
  pinned,
  onHover,
}: {
  token: Token;
  rank: number;
  pinned: boolean;
  onHover: (address: string | null) => void;
}) {
  const prev = useRef<number | null>(token.price);
  const [flash, setFlash] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (
      typeof token.price === "number" &&
      typeof prev.current === "number" &&
      prev.current !== token.price
    ) {
      setFlash(true);
      const id = setTimeout(() => setFlash(false), 1100);
      prev.current = token.price;
      return () => clearTimeout(id);
    }
    prev.current = token.price;
  }, [token.price]);

  const change = token.priceChange24h ?? 0;
  const up = change >= 0;
  const hasChange = token.priceChange24h != null;

  const copy = () => {
    if (!token.address) return;
    navigator.clipboard?.writeText(token.address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1300);
    });
  };

  return (
    <li
      onMouseEnter={() => token.address && onHover(token.address)}
      onMouseLeave={() => onHover(null)}
      className={`group relative grid grid-cols-[40px_280px_72px_120px_90px_120px_120px_120px_140px] items-center gap-3 border-b border-rule px-4 py-3 transition ${
        pinned ? "bg-surface-2" : "hover:bg-surface-2/60"
      } ${flash ? "row-flash" : ""}`}
    >
      {pinned && (
        <span className="absolute inset-y-0 left-0 w-0.5 bg-accent" />
      )}

      <span className="font-mono text-[11px] tabular-nums text-ink-mute">
        {String(rank).padStart(2, "0")}
      </span>

      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="truncate font-sans text-[14px] font-semibold tracking-tight text-ink">
            {token.symbol.toUpperCase()}
          </span>
          <span className="truncate font-sans text-[12px] text-ink-mute" title={token.name}>
            {token.name}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          {token.address ? (
            <button
              onClick={copy}
              className="pill px-2 py-0.5 font-mono text-[10px] text-ink-mute transition hover:text-accent"
              title="Copy address"
            >
              {copied ? "copied" : shortAddress(token.address, 4, 4)}
            </button>
          ) : (
            <span className="font-mono text-[10px] text-ink-mute">no address</span>
          )}
        </div>
      </div>

      <SourcePill source={token.source} />

      <span className="text-right font-mono text-[14px] font-semibold tabular-nums text-ink">
        {formatUsd(token.price)}
      </span>

      <span
        className={`text-right font-mono text-[12px] font-medium tabular-nums ${
          !hasChange ? "text-ink-mute" : up ? "text-up" : "text-down"
        }`}
      >
        {!hasChange ? "—" : `${up ? "▲" : "▼"} ${formatPct(change)}`}
      </span>

      <span className="text-right font-mono text-[12px] tabular-nums text-ink-2">
        {formatUsd(token.volume24h)}
      </span>
      <span className="text-right font-mono text-[12px] tabular-nums text-ink-2">
        {formatUsd(token.marketCap)}
      </span>
      <span className="text-right font-mono text-[12px] tabular-nums text-ink-2">
        {formatUsd(token.liquidity)}
      </span>

      <div className="flex justify-end">
        <Sparkline
          seedKey={token.address ?? `${token.symbol}-${token.source}`}
          trend={token.priceChange24h}
          width={132}
          height={26}
          points={28}
          thickness={1.4}
        />
      </div>
    </li>
  );
}
