import type { TokenSource } from "../lib/types";

const labels: Record<TokenSource, string> = {
  dex: "DEX",
  jupiter: "JUP",
  coingecko: "GKO",
};

export function SourcePill({ source }: { source: TokenSource }) {
  const tone =
    source === "dex"
      ? "border-src-dex/40 bg-src-dex/12 text-src-dex"
      : source === "jupiter"
        ? "border-accent-2/45 bg-accent-2/12 text-accent-2"
        : "border-src-gko/45 bg-src-gko/14 text-src-gko";

  return (
    <span
      className={`inline-flex rounded-[4px] border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${tone}`}
    >
      {labels[source]}
    </span>
  );
}
