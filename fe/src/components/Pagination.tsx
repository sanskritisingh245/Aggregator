interface Props {
  cursor: number;
  limit: number;
  count: number;
  nextCursor: number | null;
  loading?: boolean;
  onPrev: () => void;
  onNext: () => void;
  onLimitChange: (limit: number) => void;
  pageSizes?: number[];
}

const DEFAULT_SIZES = [10, 20, 30, 50];

export function Pagination({
  cursor,
  limit,
  count,
  nextCursor,
  loading,
  onPrev,
  onNext,
  onLimitChange,
  pageSizes = DEFAULT_SIZES,
}: Props) {
  const hasPrev = cursor > 0 && !loading;
  const hasNext = nextCursor != null && !loading;
  const from = count === 0 ? 0 : cursor + 1;
  const to = cursor + count;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs text-ink-mute">
        <span>
          Showing
          <span className="mx-1.5 font-medium tabular-nums text-ink">{from}</span>
          –
          <span className="mx-1.5 font-medium tabular-nums text-ink">{to}</span>
        </span>

        <span className="flex items-center gap-2">
          <span className="uppercase tracking-[0.18em]">Show</span>
          <div className="relative">
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="pill appearance-none py-1 pl-2.5 pr-7 font-mono text-xs font-medium tabular-nums text-ink transition hover:border-rule-strong focus:border-accent/50 focus:outline-none"
              aria-label="Tokens per page"
            >
              {pageSizes.map((s) => (
                <option key={s} value={s} className="bg-surface text-ink">
                  {s}
                </option>
              ))}
            </select>
            <svg
              viewBox="0 0 24 24"
              className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-ink-mute"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
            </svg>
          </div>
          <span className="text-ink-mute">per page</span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          disabled={!hasPrev}
          onClick={onPrev}
          className="pill inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink-2 transition hover:border-rule-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="font-mono">←</span>
          Prev
        </button>
        {hasNext ? (
          <button
            onClick={onNext}
            className="inline-flex items-center gap-1.5 rounded-full border border-accent/45 bg-accent/15 px-3 py-1.5 text-xs font-medium text-accent transition hover:border-accent/65 hover:bg-accent/25"
          >
            Next
            <span className="font-mono">→</span>
          </button>
        ) : (
          <span
            aria-disabled="true"
            className="pill inline-flex select-none items-center gap-1.5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-mute"
            title="No more tokens to load"
          >
            <span>End of list</span>
            <span>·</span>
            <span className="tabular-nums">{to}/{to}</span>
          </span>
        )}
      </div>
    </div>
  );
}
