import { requireAllowedUserOrRedirect } from "@/lib/auth/guard";
import { TopNav } from "@/components/top-nav";
import { BottomTabBar } from "@/components/bottom-tab-bar";
import { Footer } from "@/components/footer";
import { UndoToastProvider } from "@/components/undo-toast-provider";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAllowedUserOrRedirect();

  return (
    <UndoToastProvider>
      <TopNav />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <Footer />
      <BottomTabBar />
    </UndoToastProvider>
  );
}
