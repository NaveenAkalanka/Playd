import { cn } from "@/lib/utils";

/**
 * Empty / no-match state for poster grids: a ghosted poster stack, a line
 * saying what's going on, and (optionally) the action that fixes it.
 */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-4 py-16 text-center sm:py-24", className)}>
      <div aria-hidden="true" className="relative mb-6 h-24 w-28">
        <div className="absolute left-1 top-2 h-20 w-14 -rotate-12 rounded-[6px] border border-border bg-surface" />
        <div className="absolute right-1 top-2 h-20 w-14 rotate-12 rounded-[6px] border border-border bg-surface" />
        <div className="absolute left-1/2 top-0 flex h-22 w-15 -translate-x-1/2 items-center justify-center rounded-[6px] border border-accent/40 bg-surface-2 shadow-[0_10px_30px_-12px_var(--accent)]">
          <Icon className="size-6 text-accent" />
        </div>
      </div>
      <h2 className="text-lg font-bold text-balance">{title}</h2>
      {body ? <p className="mt-1.5 max-w-sm text-sm text-text-muted text-pretty">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export const emptyActionClass =
  "inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover";
