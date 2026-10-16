import { getLibrary } from "@/lib/actions/items";
import { MediaTabClient } from "@/components/media-tab-client";

export const dynamic = "force-dynamic";

export default async function MoviesPage() {
  const items = await getLibrary("movie");
  return <MediaTabClient mediaType="movie" items={items} />;
}
