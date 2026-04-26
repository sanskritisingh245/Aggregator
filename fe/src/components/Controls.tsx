import type { SortKey, SortOrder } from "../lib/types";

interface Props {
  sortBy: SortKey;
  order: SortOrder;
  onSortBy: (s: SortKey) => void;
  onOrder: (o: SortOrder) => void;
}

const sortOptions: { key: SortKey; label: string }[] = [
  { key: "volume", label: "Volume" },
  { key: "price", label: "Price" },
  { key: "marketCap", label: "Mkt Cap" },
  { key: "priceChange", label: "24h Δ" },
];

export function Controls({ sortBy, order, onSortBy, onOrder }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-1 sm:gap-3">
        <span className="panel-code hidden sm:inline">
          Sort by
        </span>
        <div className="pill relative flex items-center p-1">
          {sortOptions.map((opt) => {
            const active = sortBy === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => onSortBy(opt.key)}
                className={`relative px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] transition ${
                  active
                    ? "tab-active bg-surface-3 text-accent-soft"
                    : "text-ink-mute hover:text-ink-2"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={() => onOrder(order === "desc" ? "asc" : "desc")}
        className="pill inline-flex items-center gap-2 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-2 transition hover:border-rule-strong hover:text-ink"
        title="Toggle sort direction"
      >
        <span className="font-mono text-base leading-none text-accent-2">
          {order === "desc" ? "↓" : "↑"}
        </span>
        <span>
          {order === "desc" ? "Desc" : "Asc"}
        </span>
      </button>
    </div>
  );
}
