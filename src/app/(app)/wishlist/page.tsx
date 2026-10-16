import { getWishlist } from "@/lib/actions/wishlist";
import { WishlistPageClient } from "@/components/wishlist-page-client";

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const [movies, tv, games] = await Promise.all([
    getWishlist("movie"),
    getWishlist("tv"),
    getWishlist("game"),
  ]);
  return <WishlistPageClient movies={movies} tv={tv} games={games} />;
}
