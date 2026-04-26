import type { Token } from "../lib/types";
import { formatPct, formatUsd, shortAddress } from "../lib/format";
import { Sparkline } from "./Sparkline";
import { SourcePill } from "./SourcePill";

interface Props {
  token: Token | undefined;
  rank: number;
}

export function Spotlight({ token, rank }: Props) {
  if (!token) {
    return (
      <article className="card spotlight-card regmarks flex items-center justify-center px-8 py-20">
        <p className="pill px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-mute">
          waiting on snapshot…
        </p>
      </article>
    );
  }

  const change = token.priceChange24h ?? 0;
  const up = change >= 0;
  const hasChange = token.priceChange24h != null;
  const seedKey = token.address ?? `${token.symbol}-${token.source}`;

  return (
    <article className="card spotlight-card regmarks relative overflow-hidden">
      <div className="grid grid-cols-1 gap-7 px-6 py-7 sm:px-8 sm:py-8 md:grid-cols-[1fr_180px]">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            <span className="block h-1.5 w-1.5 rounded-full bg-accent" />
            <span className="text-accent">channel s-02 · leader {String(rank).padStart(2, "0")}</span>
            <span className="text-rule-strong">·</span>
            <SourcePill source={token.source} />
          </div>

          <h3
            className="mt-3 font-display font-semibold uppercase leading-[0.92] tracking-tight text-ink"
            style={{ fontSize: "clamp(44px, 5.2vw, 72px)" }}
          >
            {token.symbol.toUpperCase()}
          </h3>
          <p className="mt-1 truncate font-sans text-sm text-ink-mute" title={token.name}>
            {token.name}
          </p>

          <div className="mt-6 flex flex-wrap items-end gap-6">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                Price
              </div>
              <div
                className="mt-1 font-mono text-[42px] font-semibold leading-none tabular-nums text-ink"
                style={{ fontSize: "clamp(36px, 4vw, 56px)" }}
              >
                {formatUsd(token.price)}
              </div>
            </div>
            <div
              className={`font-mono text-[18px] font-semibold tabular-nums ${
                !hasChange ? "text-ink-mute" : up ? "text-up" : "text-down"
              }`}
            >
              {!hasChange ? "—" : `${up ? "▲" : "▼"} ${formatPct(change)}`}
              <span className="ml-1 text-[10px] uppercase tracking-[0.2em] text-ink-mute">24h</span>
            </div>
          </div>

          <div className="mt-6 -mx-1">
            <Sparkline
              seedKey={seedKey}
              trend={token.priceChange24h}
              width={680}
              height={62}
              points={56}
              thickness={1.7}
              withFill
            />
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <Stat label="Volume" value={formatUsd(token.volume24h)} />
            <Stat label="Mkt Cap" value={formatUsd(token.marketCap)} />
            <Stat label="Liquidity" value={formatUsd(token.liquidity)} />
            <Stat
              label="Address"
              value={token.address ? shortAddress(token.address, 4, 4) : "—"}
              mono
            />
          </dl>
        </div>

        <aside className="hidden border-l border-rule pl-6 md:block">
          <div className="font-mono text-[10px] uppercase leading-relaxed tracking-[0.22em] text-ink-mute">
            sort-driven
            <br />
            spotlight
            <br />
            panel
          </div>
          <div className="mt-3 border border-rule bg-surface-2 px-2 py-1 font-mono text-[10px] text-ink-2">
            RANK {String(rank).padStart(2, "0")}
          </div>
        </aside>
      </div>
    </article>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute">{label}</dt>
      <dd
        className={`mt-1 truncate tabular-nums ${
          mono
            ? "font-mono text-sm text-ink-2"
            : "font-mono text-[18px] font-medium text-ink"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
