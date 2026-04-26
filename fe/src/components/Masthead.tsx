interface Props {
  totalKnown: number;
  avgChange: number | null;
}

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatToday() {
  const d = new Date();
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function weatherOfMarket(avg: number | null): string {
  if (avg == null) return "indeterminate";
  if (avg > 5) return "exuberant";
  if (avg > 1) return "warm";
  if (avg > -1) return "balanced";
  if (avg > -5) return "cooling";
  return "stormy";
}

export function Masthead({ totalKnown, avgChange }: Props) {
  return (
    <div className="masthead">
      <div className="mx-auto flex max-w-350 items-center justify-between gap-6 px-5 py-2 sm:px-9">
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.28em] text-ink-mute">
          <span className="text-rule-strong">—</span>
          <span className="text-ink-2">Vol. I</span>
          <span className="text-rule-strong">·</span>
          <span>№ {String(new Date().getDate()).padStart(2, "0")}</span>
        </div>

        <div className="hidden font-sans text-[11px] tracking-wide text-ink-2 sm:block">
          <span className="serif italic">{formatToday()}</span>
        </div>

        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.28em] text-ink-mute">
          <span>climate · <span className="text-ink-2">{weatherOfMarket(avgChange)}</span></span>
          <span className="text-rule-strong">·</span>
          <span className="hidden md:inline">
            <span className="tabular-nums text-ink-2">{totalKnown.toLocaleString()}</span> entries
          </span>
        </div>
      </div>
    </div>
  );
}
