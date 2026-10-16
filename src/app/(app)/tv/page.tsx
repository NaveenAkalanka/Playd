import { getLibrary } from "@/lib/actions/items";
import { MediaTabClient } from "@/components/media-tab-client";

export const dynamic = "force-dynamic";

export default async function TvPage() {
  const items = await getLibrary("tv");
  return <MediaTabClient mediaType="tv" items={items} />;
}
