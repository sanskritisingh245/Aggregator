import type { ReactNode } from "react";

interface Props {
  eyebrow?: string;
  title: string;
  meta?: ReactNode;
  size?: "sm" | "md" | "lg";
}

const titleSize: Record<NonNullable<Props["size"]>, string> = {
  sm: "text-[18px]",
  md: "text-[24px]",
  lg: "text-[32px]",
};

export function SectionHead({ eyebrow, title, meta, size = "md" }: Props) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <div className="panel-code flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 bg-accent" />
            {eyebrow}
          </div>
        )}
        <h2 className={`mt-1 font-display ${titleSize[size]} font-semibold uppercase tracking-tight text-ink`}>
          {title}
        </h2>
      </div>
      {meta && (
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
          {meta}
        </div>
      )}
    </div>
  );
}
