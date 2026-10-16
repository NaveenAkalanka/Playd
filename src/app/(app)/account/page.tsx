import { requireAllowedUserOrRedirect } from "@/lib/auth/guard";
import { AccountPageClient } from "@/components/account-page-client";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireAllowedUserOrRedirect();
  return <AccountPageClient name={user.name} email={user.email} />;
}
