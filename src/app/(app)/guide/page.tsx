import { requireAllowedUserOrRedirect } from "@/lib/auth/guard";
import { GuideContent } from "@/components/guide-content";

export const metadata = { title: "Guide · Playd" };

export default async function GuidePage() {
  await requireAllowedUserOrRedirect();
  return <GuideContent />;
}
