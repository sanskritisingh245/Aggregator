export function formatUsd(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (!Number.isFinite(num)) return "—";
  if (num === 0) return "$0";
  const abs = Math.abs(num);
  if (abs >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(num / 1_000).toFixed(2)}K`;
  if (abs >= 1) return `$${num.toFixed(2)}`;
  if (abs >= 0.01) return `$${num.toFixed(4)}`;
  return `$${num.toPrecision(3)}`;
}

export function formatPct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export function shortAddress(addr: string, lead = 4, tail = 4): string {
  if (!addr) return "";
  if (addr.length <= lead + tail + 1) return addr;
  return `${addr.slice(0, lead)}…${addr.slice(-tail)}`;
}
