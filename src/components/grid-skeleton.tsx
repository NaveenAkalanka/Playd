// Shown by each route's loading.tsx while its server data fetch is in
// flight, so navigating to a tab never shows a blank page.
export function GridSkeleton({ heading = true }: { heading?: boolean }) {
  return (
    <div className="p-4" aria-busy="true" aria-label="Loading">
      {heading && <div className="skeleton mb-4 h-8 w-40 rounded-md" />}
      <div className="skeleton mb-3 h-9 w-full max-w-md rounded-md" />
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} className="skeleton aspect-[2/3] rounded-[6px]" />
        ))}
      </div>
    </div>
  );
}
