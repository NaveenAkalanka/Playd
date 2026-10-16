import { getLibrary } from "@/lib/actions/items";
import { MediaTabClient } from "@/components/media-tab-client";

export const dynamic = "force-dynamic";

export default async function GamesPage() {
  const items = await getLibrary("game");
  return <MediaTabClient mediaType="game" items={items} />;
}
