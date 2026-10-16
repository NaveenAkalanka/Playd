import { getFavorites } from "@/lib/actions/items";
import { HallOfFamePageClient } from "@/components/hall-of-fame-page-client";

export const dynamic = "force-dynamic";

export default async function HallOfFamePage() {
  const [movies, tv, games] = await Promise.all([
    getFavorites("movie"),
    getFavorites("tv"),
    getFavorites("game"),
  ]);
  return <HallOfFamePageClient movies={movies} tv={tv} games={games} />;
}
