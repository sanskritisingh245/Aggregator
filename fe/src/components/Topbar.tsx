import { useEffect, useRef, useState } from "react";
import type { ConnectionState } from "../hooks/useLiveSocket";

interface Props {
  status: ConnectionState;
  lastTickAt: number | null;
  totalKnown: number;
  lap: number;
  leader: string;
  riser: string;
  crasher: string;
}

const dotColor: Record<ConnectionState, string> = {
  open: "bg-accent",
  connecting: "bg-ink-2",
  closed: "bg-down",
};

const statusLabel: Record<ConnectionState, string> = {
  open: "Live",
  connecting: "Connecting",
  closed: "Offline",
};

function timeAgo(ts: number | null) {
  if (!ts) return "—";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

export function Topbar({ status, lastTickAt, totalKnown, lap, leader, riser, crasher }: Props) {
  // Trigger a one-shot pop animation on the lap counter every time it ticks.
  // Toggling a key forces React to remount the span, which restarts the
  // CSS keyframes — simpler & jank-free vs. timers.
  const [popKey, setPopKey] = useState(0);
  const prevLap = useRef(lap);
  useEffect(() => {
    if (prevLap.current !== lap) {
      setPopKey((k) => k + 1);
      prevLap.current = lap;
    }
  }, [lap]);

  return (
    <header className="sticky top-0 z-20 border-b border-rule-strong bg-bg/94 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-350 items-center justify-between gap-6 px-5 sm:px-9">
        <div className="flex items-center gap-4">
          <div className="grid h-9 w-9 place-items-center border border-accent bg-surface-3 font-mono text-[11px] font-bold text-accent">
            AG
          </div>

          <div className="flex items-baseline gap-3">
            <h1 className="font-display text-[24px] font-semibold tracking-tight text-ink">
              Aggregator
            </h1>
            <span className="hidden text-[12px] text-ink-mute sm:inline">
              Solana token markets
            </span>
            <span className="hidden border border-rule bg-surface-2 px-2 py-0.5 font-mono text-[11px] tabular-nums text-ink-mute md:inline">
              {totalKnown.toLocaleString()} tokens
            </span>
          </div>
        </div>

        <div className="hidden items-center gap-3 font-mono text-[11px] text-ink-mute lg:flex">
          <span>
            Tick{" "}
            <span
              key={popKey}
              className="lap-pop tabular-nums text-accent"
            >
              {lap}
            </span>
          </span>
          <span className="text-rule-strong">·</span>
          <span>Top <span className="text-ink-2">{leader}</span></span>
          <span className="text-rule-strong">·</span>
          <span>Gainer <span className="text-up">{riser}</span></span>
          <span className="text-rule-strong">·</span>
          <span>Loser <span className="text-down">{crasher}</span></span>
        </div>

        <div className="pill flex items-center gap-2 px-3 py-1.5">
            <span className="relative grid h-2 w-2 place-items-center">
              <span className={`live-pulse block h-1.5 w-1.5 rounded-full ${dotColor[status]}`} />
              {status === "open" && (
                <span className="live-ring absolute h-1.5 w-1.5 rounded-full" />
              )}
            </span>
            <span className="font-sans text-[12px] font-medium text-ink">
              {statusLabel[status]}
            </span>
            <span className="text-rule-strong">·</span>
            <span className="font-mono text-[11px] tabular-nums text-ink-mute">
              {timeAgo(lastTickAt)}
            </span>
        </div>
      </div>
    </header>
  );
}
