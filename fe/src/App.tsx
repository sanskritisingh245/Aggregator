import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Liveline } from "liveline";
import type { LivelinePoint } from "liveline";
import { fetchTokens } from "./lib/api";
import type { Token, TokenSource } from "./lib/types";
import type { ConnectionState } from "./hooks/useLiveSocket";
import { useLiveSocket } from "./hooks/useLiveSocket";
import { formatPct, formatUsd, shortAddress } from "./lib/format";

const BOOTSTRAP_LIMIT = 50;

const PAGE_SIZES = [10, 20, 30, 50] as const;
const DEFAULT_PAGE_SIZE = 10;

type SortOrder = "desc" | "asc";

function App() {
  const [allKnown, setAllKnown] = useState<Token[]>([]);
  const [, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState(0);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [order, setOrder] = useState<SortOrder>("desc");

  const bootstrappedRef = useRef(false);

  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchTokens({
          sortBy: "volume",
          order: "desc",
          cursor: 0,
          limit: BOOTSTRAP_LIMIT,
        });
        if (cancelled) return;
        setAllKnown((prev) => (prev.length === 0 ? res.data : prev));
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSocketTokens = useCallback((incoming: Token[]) => {
    setAllKnown(incoming);
    setLoading(false);
  }, []);

  const { status, lastTickAt } = useLiveSocket(onSocketTokens);

  const sorted = useMemo(() => {
    const dir = order === "desc" ? 1 : -1;
    return [...allKnown].sort(
      (a, b) => ((b.volume24h ?? 0) - (a.volume24h ?? 0)) * dir,
    );
  }, [allKnown, order]);

  // Snap cursor back if the dataset shrinks past the current page.
  useEffect(() => {
    if (sorted.length > 0 && cursor >= sorted.length) {
      const last = Math.max(0, Math.floor((sorted.length - 1) / pageSize) * pageSize);
      setCursor(last);
    }
  }, [sorted.length, cursor, pageSize]);

  const visibleTokens = sorted.slice(cursor, cursor + pageSize);
  const hasPrev = cursor > 0;
  const hasNext = cursor + pageSize < sorted.length;
  const goToPage = (next: number) => {
    setCursor(next);
    if (typeof window !== "undefined") {
      const el = document.getElementById("market-table");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
  const handlePageSizeChange = (next: number) => {
    setPageSize(next);
    setCursor(0);
  };
  const handleOrderChange = (next: SortOrder) => {
    setOrder(next);
    setCursor(0);
  };

  const movers = useMemo(() => {
    const wc = allKnown.filter((t) => typeof t.priceChange24h === "number");
    return [...wc].sort(
      (a, b) => Math.abs(b.priceChange24h ?? 0) - Math.abs(a.priceChange24h ?? 0),
    );
  }, [allKnown]);

  const totalVol = sorted.reduce((a, t) => a + (t.volume24h ?? 0), 0);
  const totalLiq = sorted.reduce((a, t) => a + (t.liquidity ?? 0), 0);
  const wc = allKnown.filter((t) => typeof t.priceChange24h === "number");
  const avgChange =
    wc.length === 0
      ? null
      : wc.reduce((a, t) => a + (t.priceChange24h ?? 0), 0) / wc.length;
  const upCount = wc.filter((t) => (t.priceChange24h ?? 0) > 0).length;
  const downCount = wc.filter((t) => (t.priceChange24h ?? 0) < 0).length;

  const sourceBreakdown = useMemo(() => {
    const m: Record<TokenSource, number> = { dex: 0, jupiter: 0, coingecko: 0 };
    for (const t of allKnown) m[t.source]++;
    return m;
  }, [allKnown]);

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-[1240px] px-5 py-8 sm:px-8 sm:py-10">
        <Header status={status} lastTickAt={lastTickAt} totalKnown={allKnown.length} />

        <section className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {(sorted.length === 0 ? Array.from({ length: 4 }) : sorted.slice(0, 4)).map(
            (token, i) => (
              <HighlightCard key={i} token={token as Token | undefined} rank={i + 1} />
            ),
          )}
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-6">
            <TrendCard token={sorted[0]} />
            <MarketTable
              tokens={visibleTokens}
              cursor={cursor}
              total={sorted.length}
              pageSize={pageSize}
              pageSizes={PAGE_SIZES}
              onPageSizeChange={handlePageSizeChange}
              order={order}
              onOrderChange={handleOrderChange}
              hasPrev={hasPrev}
              hasNext={hasNext}
              onPrev={() => goToPage(Math.max(0, cursor - pageSize))}
              onNext={() => goToPage(cursor + pageSize)}
            />
          </div>

          <aside className="space-y-6">
            <MarketSummary
              totalTracked={allKnown.length}
              totalVolume={totalVol}
              totalLiquidity={totalLiq}
              avgChange={avgChange}
              upCount={upCount}
              downCount={downCount}
              sources={sourceBreakdown}
            />
            <BiggestMovers movers={movers.slice(0, 6)} />
          </aside>
        </section>

        <Footer />
      </div>
    </div>
  );
}

/* ─── Header ────────────────────────────────────────────── */

function Header({
  status,
  lastTickAt,
  totalKnown,
}: {
  status: ConnectionState;
  lastTickAt: number | null;
  totalKnown: number;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-rule pb-4">
      <h1 className="text-[26px] font-bold leading-none tracking-[-0.04em] text-ink">
        Aggregator<span className="text-accent">.</span>
      </h1>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-wider text-ink-mute">
        <span className="flex items-center gap-1.5">
          <span
            className={`live-pulse h-1.5 w-1.5 rounded-full ${
              status === "open"
                ? "bg-up"
                : status === "connecting"
                  ? "bg-ink-mute"
                  : "bg-down"
            }`}
          />
          <span className="font-semibold text-ink">
            {status === "open" ? "Live" : status === "connecting" ? "Connecting" : "Offline"}
          </span>
        </span>
        <span className="text-rule-strong">/</span>
        <span>Solana</span>
        <span className="text-rule-strong">/</span>
        <span>
          <span className="tabular-nums text-ink-2">{totalKnown.toLocaleString()}</span>{" "}
          tokens
        </span>
        <span className="text-rule-strong">/</span>
        <span className="tabular-nums">{timeAgo(lastTickAt)}</span>
        <span className="hidden text-rule-strong sm:inline">/</span>
        <span className="hidden tabular-nums sm:inline">{formatIssueDate()}</span>
      </div>
    </header>
  );
}


/* ─── Highlight cards (real tokens, source pills, sparklines) ─ */

function HighlightCard({ token, rank }: { token?: Token; rank: number }) {
  if (!token) {
    return (
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div className="h-4 w-12 shimmer" />
          <div className="h-3 w-10 shimmer" />
        </div>
        <div className="mt-3 h-6 w-24 shimmer" />
        <div className="mt-3 h-7 w-full shimmer" />
      </div>
    );
  }

  const change = token.priceChange24h;
  const hasChange = typeof change === "number";
  const up = (change ?? 0) >= 0;

  return (
    <div className="card overflow-hidden">
      <div className="px-5 pt-5">
        <div className="flex items-start justify-between gap-2">
          <span className="font-display text-[28px] font-bold tabular-nums tracking-tight text-ink">
            {String(rank).padStart(2, "0")}
          </span>
          <SourceTag source={token.source} />
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span
            className="truncate font-display text-[15px] font-semibold tracking-tight text-ink"
            title={token.name}
          >
            {token.name}
          </span>
          <span className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-mute">
            {token.symbol}
          </span>
        </div>
        <div className="mt-0.5 font-mono text-[10px] tabular-nums text-ink-mute">
          {token.address ? shortAddress(token.address, 4, 4) : "no address"}
        </div>

        <div className="mt-4 flex items-baseline justify-between gap-2">
          <span className="font-display text-[20px] font-bold tabular-nums tracking-tight text-ink">
            {formatUsd(token.price)}
          </span>
          {hasChange ? (
            <span
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                up ? "bg-up-soft text-up" : "bg-down-soft text-down"
              }`}
            >
              <Arrow up={up} />
              {Math.abs(change).toFixed(2)}%
            </span>
          ) : (
            <span className="text-[12px] text-ink-mute">—</span>
          )}
        </div>
      </div>

      <div className="mt-4">
        <MiniSpark
          seedKey={token.address ?? `${token.symbol}-${token.source}`}
          trend={token.priceChange24h}
          width={300}
          height={44}
          points={42}
          withFill
        />
      </div>
    </div>
  );
}

/* ─── Trend card (replaces "Portfolio Balance") ─────────── */

function TrendCard({ token }: { token?: Token }) {
  if (!token) {
    return (
      <div className="card p-6">
        <div className="h-4 w-40 shimmer" />
        <div className="mt-2 h-7 w-64 shimmer" />
        <div className="mt-6 h-[220px] w-full shimmer" />
      </div>
    );
  }

  const change = token.priceChange24h;
  const hasChange = typeof change === "number";
  const up = (change ?? 0) >= 0;
  const seedKey = token.address ?? `${token.symbol}-${token.source}`;

  return (
    <section className="card p-7">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-ink-mute">
          <span className="h-px w-6 bg-accent" />
          The leader, by 24h volume
        </div>
        <SourceTag source={token.source} />
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h3 className="serif-italic text-[44px] font-medium leading-[0.95] tracking-tight text-ink">
            {token.name}
          </h3>
          <div className="mt-1.5 flex items-center gap-2 font-mono text-[12px] tabular-nums text-ink-mute">
            <span className="font-semibold uppercase tracking-wider text-ink-2">
              {token.symbol}
            </span>
            {token.address && (
              <>
                <span className="text-rule-strong">·</span>
                <span>{shortAddress(token.address, 4, 4)}</span>
              </>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className="serif tabular-nums text-[40px] font-medium leading-none tracking-[-0.02em] text-ink">
            {formatUsd(token.price)}
          </div>
          {hasChange && (
            <div
              className={`mt-2.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold tabular-nums ${
                up ? "bg-up-soft text-up" : "bg-down-soft text-down"
              }`}
            >
              <Arrow up={up} />
              {up ? "+" : ""}
              {formatPct(change)}
              <span className="ml-1 text-[10px] font-medium opacity-70">24h</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-7" style={{ height: 240 }}>
        <TrendChart seedKey={seedKey} trend={token.priceChange24h} price={token.price} />
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-rule pt-5 sm:grid-cols-4">
        <Stat label="Market cap" value={formatUsd(token.marketCap)} />
        <Stat label="24h volume" value={formatUsd(token.volume24h)} />
        <Stat label="Liquidity" value={formatUsd(token.liquidity)} />
        <Stat
          label="Updates"
          value="every 30s"
        />
      </dl>
    </section>
  );
}

/* ─── Recharts trend chart ──────────────────────────────── */

// Chart accent — vivid teal, stands apart from up/down red & green so the
// trend chart reads as a brand-coloured viz, not a status indicator.
const CHART_COLOR = "#0ea5b5";

function TrendChart({
  seedKey,
  trend,
  price,
}: {
  seedKey: string;
  trend: number | null;
  price: number | null;
}) {
  const basePrice = typeof price === "number" && price > 0 ? price : 1;

  const series = useMemo<LivelinePoint[]>(() => {
    const points = buildChartSeries(seedKey, trend, basePrice, 64);
    const now = Math.floor(Date.now() / 1000);
    const stepSeconds = (24 * 60 * 60) / (points.length - 1);
    return points.map((p, i) => ({
      time: now - Math.round((points.length - 1 - i) * stepSeconds),
      value: p.v,
    }));
  }, [seedKey, trend, basePrice]);

  const latestValue = series[series.length - 1]?.value ?? basePrice;
  const fmt = useCallback((v: number) => formatUsd(v), []);

  if (series.length === 0) {
    return <div className="h-full w-full shimmer" />;
  }

  return (
    <Liveline
      data={series}
      value={latestValue}
      color={CHART_COLOR}
      theme="light"
      window={24 * 60 * 60}
      formatValue={fmt}
      grid
      badge
      fill
      lineWidth={2.2}
    />
  );
}

function buildChartSeries(
  seedKey: string,
  trend: number | null,
  basePrice: number,
  points: number,
) {
  const rng = makeRng(seedKey + ":" + (trend ?? 0).toFixed(2));
  const t = (trend ?? 0) / 100;
  const series: { t: string; v: number }[] = [];
  let v = 0;
  for (let i = 0; i < points; i++) {
    const noise = (rng() - 0.5) * 0.18;
    const drift = (t * (i / (points - 1))) * 0.6;
    v = v * 0.86 + noise + drift * 0.06;
    const hoursAgo = Math.round(((points - 1 - i) / (points - 1)) * 24);
    const label = i === points - 1 ? "now" : `−${hoursAgo}h`;
    const price = Math.max(0, basePrice * (1 + v * 0.04));
    series.push({ t: label, v: price });
  }
  return series;
}

function Stat({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="font-mono text-[10px] uppercase tracking-wider text-ink-mute">
        {label}
      </dt>
      <dd
        className={`mt-1.5 truncate tabular-nums ${
          mono
            ? "font-mono text-[13px] text-ink-2"
            : "font-display text-[16px] font-bold text-ink"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

/* ─── Market table (no Trade button, honest columns) ────── */

function MarketTable({
  tokens,
  cursor,
  total,
  pageSize,
  pageSizes,
  onPageSizeChange,
  order,
  onOrderChange,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
}: {
  tokens: Token[];
  cursor: number;
  total: number;
  pageSize: number;
  pageSizes: readonly number[];
  onPageSizeChange: (n: number) => void;
  order: SortOrder;
  onOrderChange: (o: SortOrder) => void;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  const from = total === 0 ? 0 : cursor + 1;
  const to = Math.min(cursor + pageSize, total);
  const page = Math.floor(cursor / pageSize) + 1;
  const totalPages = total === 0 ? 1 : Math.ceil(total / pageSize);

  return (
    <section id="market-table" className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-6 py-5">
        <div>
          <h2 className="serif-italic text-[26px] font-medium leading-none tracking-tight text-ink">
            The market
          </h2>
          <p className="mt-1.5 font-mono text-[11px] text-ink-mute">
            Sorted by 24h volume · refreshes every 30s
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div
            role="group"
            aria-label="Sort direction"
            className="inline-flex rounded-lg border border-rule bg-card p-0.5"
          >
            <button
              onClick={() => onOrderChange("desc")}
              aria-pressed={order === "desc"}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-semibold ${
                order === "desc"
                  ? "bg-ink text-bg"
                  : "text-ink-mute hover:text-ink"
              }`}
            >
              <Arrow up={false} />
              Desc
            </button>
            <button
              onClick={() => onOrderChange("asc")}
              aria-pressed={order === "asc"}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-semibold ${
                order === "asc"
                  ? "bg-ink text-bg"
                  : "text-ink-mute hover:text-ink"
              }`}
            >
              <Arrow up={true} />
              Asc
            </button>
          </div>
          <span className="font-mono text-[11px] text-ink-mute tabular-nums">
            {total === 0 ? "—" : `${from}–${to} of ${total}`}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-rule text-left font-mono text-[10px] uppercase tracking-wider text-ink-mute">
              <th className="px-6 py-3 font-medium">#</th>
              <th className="px-6 py-3 font-medium">Token</th>
              <th className="px-6 py-3 font-medium">Source</th>
              <th className="px-6 py-3 text-right font-medium">Price</th>
              <th className="px-6 py-3 text-right font-medium">24h</th>
              <th className="px-6 py-3 text-right font-medium">Volume</th>
              <th className="px-6 py-3 text-right font-medium">Liquidity</th>
              <th className="px-6 py-3 text-right font-medium">Trend</th>
            </tr>
          </thead>
          <tbody>
            {tokens.length === 0 &&
              Array.from({ length: 8 }).map((_, i) => (
                <tr
                  key={`skel-${i}`}
                  className={i < 7 ? "border-b border-rule" : ""}
                >
                  <td className="px-6 py-3.5">
                    <div className="h-3 w-6 shimmer" />
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="h-3 w-32 shimmer" />
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="h-3 w-10 shimmer" />
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="ml-auto h-3 w-16 shimmer" />
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="ml-auto h-3 w-12 shimmer" />
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="ml-auto h-3 w-20 shimmer" />
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="ml-auto h-3 w-20 shimmer" />
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="ml-auto h-3 w-20 shimmer" />
                  </td>
                </tr>
              ))}
            {tokens.map((token, i) => {
              const change = token.priceChange24h;
              const hasChange = typeof change === "number";
              const up = (change ?? 0) >= 0;
              return (
                <tr
                  key={`${token.address}-${i}`}
                  className={`row-hover ${i < tokens.length - 1 ? "border-b border-rule" : ""}`}
                >
                  <td className="px-6 py-3.5 font-mono text-[12px] tabular-nums text-ink-mute">
                    {String(cursor + i + 1).padStart(2, "0")}
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-baseline gap-2">
                      <span className="truncate font-semibold text-[14px] text-ink" title={token.name}>
                        {token.name}
                      </span>
                      <span className="shrink-0 rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-ink-mute">
                        {token.symbol.toUpperCase()}
                      </span>
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] tabular-nums text-ink-mute">
                      {token.address ? shortAddress(token.address, 4, 4) : "no address"}
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    <SourceTag source={token.source} />
                  </td>
                  <td className="px-6 py-3.5 text-right font-medium tabular-nums text-[13px] text-ink">
                    {formatUsd(token.price)}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    {hasChange ? (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                          up ? "bg-up-soft text-up" : "bg-down-soft text-down"
                        }`}
                      >
                        <Arrow up={up} />
                        {Math.abs(change).toFixed(2)}%
                      </span>
                    ) : (
                      <span className="text-[13px] text-ink-mute">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-right tabular-nums text-[13px] text-ink-2">
                    {formatUsd(token.volume24h)}
                  </td>
                  <td className="px-6 py-3.5 text-right tabular-nums text-[13px] text-ink-2">
                    {formatUsd(token.liquidity)}
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex justify-end">
                      <MiniSpark
                        seedKey={
                          token.address ?? `${token.symbol}-${token.source}`
                        }
                        trend={token.priceChange24h}
                        width={120}
                        height={28}
                        points={28}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-rule px-6 py-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-ink-mute">
          <span className="tabular-nums">
            Page <span className="font-semibold text-ink">{page}</span> of{" "}
            <span className="font-semibold text-ink">{totalPages}</span>
            <span className="ml-2">
              · showing {from === 0 ? 0 : `${from}–${to}`} of {total}
            </span>
          </span>

          <span className="flex items-center gap-2">
            <span>Show</span>
            <div className="relative">
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                aria-label="Tokens per page"
                className="appearance-none rounded-lg border border-rule bg-card py-1.5 pl-3 pr-8 text-[13px] font-semibold tabular-nums text-ink hover:border-rule-strong focus:border-accent"
              >
                {pageSizes.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <svg
                viewBox="0 0 24 24"
                className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-ink-mute"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span>per page</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onPrev}
            disabled={!hasPrev}
            className="inline-flex items-center gap-2 rounded-lg border border-rule bg-card px-4 py-2 text-[13px] font-semibold text-ink-2 hover:border-rule-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Arrow up={false} rotate="left" />
            Prev
          </button>

          {hasNext ? (
            <button
              onClick={onNext}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2 text-[13px] font-semibold text-white shadow-[0_4px_10px_rgba(79,96,255,0.28)] hover:bg-accent-2 hover:-translate-y-px"
            >
              Next page
              <Arrow up={false} rotate="right" />
            </button>
          ) : (
            <span
              aria-disabled="true"
              className="inline-flex select-none items-center gap-2 rounded-lg border border-rule bg-surface-2 px-4 py-2 text-[13px] font-medium text-ink-mute"
              title="No more tokens to load"
            >
              End of list
              <span className="tabular-nums">· {to}/{total}</span>
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

/* ─── Market summary panel ──────────────────────────────── */

function MarketSummary({
  totalTracked,
  totalVolume,
  totalLiquidity,
  avgChange,
  upCount,
  downCount,
  sources,
}: {
  totalTracked: number;
  totalVolume: number;
  totalLiquidity: number;
  avgChange: number | null;
  upCount: number;
  downCount: number;
  sources: Record<TokenSource, number>;
}) {
  const totalChanges = upCount + downCount;
  const upPct = totalChanges === 0 ? 0 : (upCount / totalChanges) * 100;

  return (
    <section className="card p-6">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-ink-mute">
        <span className="h-px w-5 bg-accent" />
        Summary
      </div>
      <h2 className="mt-2 serif-italic text-[24px] font-medium leading-none tracking-tight text-ink">
        Today, in numbers
      </h2>

      <dl className="mt-5 divide-y divide-rule">
        <SummaryRow label="Tracked" value={totalTracked.toLocaleString()} />
        <SummaryRow label="Total 24h volume" value={formatBig(totalVolume)} />
        <SummaryRow label="Total liquidity" value={formatBig(totalLiquidity)} />
        <SummaryRow
          label="Avg 24h Δ"
          value={
            avgChange == null
              ? "—"
              : `${avgChange >= 0 ? "+" : ""}${avgChange.toFixed(2)}%`
          }
          tone={
            avgChange == null
              ? "text-ink-2"
              : avgChange >= 0
                ? "text-up"
                : "text-down"
          }
        />
      </dl>

      {totalChanges > 0 && (
        <div className="mt-5">
          <div className="flex items-baseline justify-between font-mono text-[11px] tabular-nums">
            <span className="font-semibold text-up">{upCount} up</span>
            <span className="font-semibold text-down">{downCount} down</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-down-soft">
            <div
              className="h-full rounded-full bg-up transition-[width] duration-500"
              style={{ width: `${upPct}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-6 border-t border-rule pt-5">
        <div className="font-mono text-[10px] uppercase tracking-wider text-ink-mute">
          Sources
        </div>
        <ul className="mt-3 space-y-2">
          <SourceRow label="DexScreener" count={sources.dex} source="dex" />
          <SourceRow label="Jupiter" count={sources.jupiter} source="jupiter" />
          <SourceRow
            label="CoinGecko"
            count={sources.coingecko}
            source="coingecko"
          />
        </ul>
      </div>
    </section>
  );
}

function SummaryRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <dt className="text-[13px] text-ink-2">{label}</dt>
      <dd
        className={`font-display text-[16px] font-bold tabular-nums tracking-tight ${tone ?? "text-ink"}`}
      >
        {value}
      </dd>
    </div>
  );
}

function SourceRow({
  label,
  count,
  source,
}: {
  label: string;
  count: number;
  source: TokenSource;
}) {
  const dotColor =
    source === "dex"
      ? "bg-src-dex"
      : source === "jupiter"
        ? "bg-src-jup"
        : "bg-src-gko";
  return (
    <li className="flex items-center justify-between text-[13px]">
      <span className="flex items-center gap-2.5 text-ink-2">
        <span className={`h-2.5 w-2.5 rounded-full ring-2 ring-card ${dotColor}`} />
        {label}
      </span>
      <span className="font-medium tabular-nums text-ink">{count}</span>
    </li>
  );
}

/* ─── Biggest movers (no fake Buy/Sell framing) ─────────── */

function BiggestMovers({ movers }: { movers: Token[] }) {
  return (
    <section className="card p-6">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-ink-mute">
        <span className="h-px w-5 bg-accent" />
        Movers
      </div>
      <h2 className="mt-2 serif-italic text-[24px] font-medium leading-none tracking-tight text-ink">
        Biggest moves, last 24h
      </h2>
      <p className="mt-1.5 font-mono text-[11px] text-ink-mute">
        Ranked by absolute price change
      </p>

      <ul className="mt-4 space-y-1">
        {movers.length === 0 &&
          Array.from({ length: 5 }).map((_, i) => (
            <li
              key={`skel-${i}`}
              className={`flex items-center gap-3 py-2.5 ${i < 4 ? "border-b border-rule" : ""}`}
            >
              <div className="h-3 w-4 shimmer" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-20 shimmer" />
                <div className="h-2.5 w-24 shimmer" />
              </div>
              <div className="h-3 w-12 shimmer" />
            </li>
          ))}
        {movers.map((token, i) => {
          const change = token.priceChange24h ?? 0;
          const up = change >= 0;
          return (
            <li
              key={`mv-${token.address}-${i}`}
              className={`flex items-center gap-3 py-2.5 ${i < movers.length - 1 ? "border-b border-rule" : ""}`}
            >
              <span className="font-mono text-[11px] tabular-nums text-ink-mute">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="truncate font-semibold text-[13px] text-ink" title={token.name}>
                    {token.name}
                  </span>
                  <span className="shrink-0 rounded bg-surface-2 px-1 py-0.5 font-mono text-[9px] font-semibold tracking-wider text-ink-mute">
                    {token.symbol.toUpperCase()}
                  </span>
                </div>
                <div className="font-mono text-[10px] tabular-nums text-ink-mute">
                  {token.address ? shortAddress(token.address, 4, 4) : "no address"}
                </div>
              </div>
              <div className="text-right">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                    up ? "bg-up-soft text-up" : "bg-down-soft text-down"
                  }`}
                >
                  <Arrow up={up} />
                  {Math.abs(change).toFixed(2)}%
                </span>
                <div className="mt-1 font-mono text-[11px] tabular-nums text-ink-mute">
                  {formatUsd(token.price)}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ─── Footer ────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-5 text-[12px] text-ink-mute">
      <span>
        Sources: <span className="text-ink-2">DexScreener</span>,{" "}
        <span className="text-ink-2">Jupiter</span>,{" "}
        <span className="text-ink-2">CoinGecko</span>
      </span>
      <span>Updates every 30s · all prices in USD</span>
    </footer>
  );
}

/* ─── SVG arrow icon ────────────────────────────────────── */

function Arrow({
  up,
  rotate,
}: {
  up: boolean;
  rotate?: "left" | "right";
}) {
  const transform =
    rotate === "left" ? "rotate(90deg)" : rotate === "right" ? "rotate(-90deg)" : undefined;
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={transform ? { transform } : undefined}
    >
      {up ? (
        <path d="M5 8.5V1.5M2 4.5l3-3 3 3" />
      ) : (
        <path d="M5 1.5v7M2 5.5l3 3 3-3" />
      )}
    </svg>
  );
}

/* ─── Source tag ────────────────────────────────────────── */

const SOURCE_LABEL: Record<TokenSource, string> = {
  dex: "DEX",
  jupiter: "Jupiter",
  coingecko: "CoinGecko",
};

function SourceTag({ source }: { source: TokenSource }) {
  const dot =
    source === "dex"
      ? "bg-src-dex"
      : source === "jupiter"
        ? "bg-src-jup"
        : "bg-src-gko";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-rule bg-card px-2 py-0.5 text-[10px] font-medium text-ink-2">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {SOURCE_LABEL[source]}
    </span>
  );
}

/* ─── Mini sparkline (inline, no external dep) ──────────── */

function MiniSpark({
  seedKey,
  trend,
  width = 120,
  height = 32,
  points = 36,
  withFill = false,
  tall = false,
}: {
  seedKey: string;
  trend: number | null;
  width?: number;
  height?: number;
  points?: number;
  withFill?: boolean;
  tall?: boolean;
}) {
  const path = useMemo(
    () => buildPath(seedKey, trend, width, height, points, 6),
    [seedKey, trend, width, height, points],
  );

  const up = (trend ?? 0) >= 0;
  const stroke =
    trend == null ? "var(--color-ink-mute)" : withFill ? "var(--color-accent)" : up ? "var(--color-up)" : "var(--color-down)";
  const fillUrl = `mini-fill-${stroke.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <svg
      width="100%"
      height={tall ? undefined : height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio={tall ? "none" : undefined}
      className="block"
      aria-hidden
      style={tall ? { width: "100%", height } : undefined}
    >
      {withFill && (
        <defs>
          <linearGradient id={fillUrl} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.18" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
      )}
      {withFill && <path d={path.fill} fill={`url(#${fillUrl})`} />}
      <path
        d={path.d}
        fill="none"
        stroke={stroke}
        strokeWidth={tall ? 2.2 : 1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="spark-draw"
        style={{ ["--len" as string]: width * 1.6 }}
      />
    </svg>
  );
}

/* ─── Helpers ───────────────────────────────────────────── */

function timeAgo(ts: number | null) {
  if (!ts) return "—";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

function formatIssueDate() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  return `${dd}.${mm}.${yy}`;
}

function formatBig(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "$0";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return formatUsd(n);
}

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

function buildPath(
  seedKey: string,
  trend: number | null,
  width: number,
  height: number,
  points: number,
  pad: number,
) {
  const rng = makeRng(seedKey + ":" + (trend ?? 0).toFixed(2));
  const t = (trend ?? 0) / 100;
  const ys: number[] = [];
  let v = 0;
  for (let i = 0; i < points; i++) {
    const noise = (rng() - 0.5) * 0.2;
    const drift = (t * (i / (points - 1))) * 0.6;
    v = v * 0.84 + noise + drift * 0.06;
    ys.push(v);
  }
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const range = maxY - minY || 1;
  const normY = ys.map(
    (y) => height - pad - ((y - minY) / range) * (height - pad * 2),
  );
  const stepX = width / (points - 1);
  const d = normY
    .map(
      (y, i) =>
        `${i === 0 ? "M" : "L"} ${(i * stepX).toFixed(2)} ${y.toFixed(2)}`,
    )
    .join(" ");
  const fill = `${d} L ${width.toFixed(2)} ${height} L 0 ${height} Z`;
  return { d, fill };
}

export default App;
