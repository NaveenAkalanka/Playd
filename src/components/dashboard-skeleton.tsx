// Shown while the dashboard data loads; mirrors the Overall tab's layout.
const block = "skeleton rounded-xl border border-border";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 px-4 md:px-10" aria-busy="true" aria-label="Loading dashboard">
      <div className={`${block} h-11 w-full rounded-full md:w-[420px]`} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`${block} h-28`} />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={`${block} h-32`} />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className={`${block} h-56`} />
        <div className={`${block} h-56 lg:col-span-2`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={`${block} h-72`} />
        <div className={`${block} h-72`} />
      </div>
    </div>
  );
}
