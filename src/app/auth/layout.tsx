// Shared backdrop for sign-in / sign-up / password screens: a dim, tilted
// wall of poster-shaped tiles (the thing this app is made of), faded out
// toward the centre so the form sits on clean black.
const COLS = 16;
const ROWS = 9;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-bg">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute left-1/2 top-1/2 grid w-[150vmax] -translate-x-1/2 -translate-y-1/2 -rotate-[8deg] gap-3"
          style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: COLS * ROWS }).map((_, i) => {
            // Deterministic variety: a few tiles carry the accent, most stay neutral.
            const accent = i % 7 === 3 || i % 11 === 5;
            return (
              <div
                key={i}
                className={
                  accent
                    ? "aspect-[2/3] rounded-[6px] bg-gradient-to-b from-accent/35 to-accent/5"
                    : "aspect-[2/3] rounded-[6px] border border-white/[0.04] bg-gradient-to-b from-surface-2 to-surface"
                }
                style={{ transform: `translateY(${(i % COLS) % 2 ? 18 : -18}%)` }}
              />
            );
          })}
        </div>
        {/* Clear the centre for the form, keep the edges as atmosphere. */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--bg)_28%,color-mix(in_srgb,var(--bg)_82%,transparent)_58%,color-mix(in_srgb,var(--bg)_55%,transparent)_100%)]" />
      </div>
      {children}
    </div>
  );
}
