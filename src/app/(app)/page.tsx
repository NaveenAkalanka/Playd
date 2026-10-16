import { Suspense } from "react";
import { getDashboard } from "@/lib/actions/dashboard";
import { DashboardView } from "@/components/dashboard-view";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";

export const dynamic = "force-dynamic";

async function DashboardContent() {
  const d = await getDashboard();

  if (d.overall.count === 0 && d.overall.wishlistCount === 0) {
    return (
      <p className="px-4 py-10 text-center text-text-muted">
        Nothing logged yet. Open Movies, TV or Games to start adding titles.
      </p>
    );
  }
  return <DashboardView data={d} />;
}

export default function HomePage() {
  return (
    <div className="pb-8 pt-6">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}
