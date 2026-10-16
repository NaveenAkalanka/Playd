import "server-only";
import { headers } from "next/headers";

// In-memory sliding-window rate limiter. This resets on cold start and
// isn't shared across regions/instances — a deliberate tradeoff for a
// personal, low-traffic, single-region app with no extra infrastructure
// (e.g. Upstash Redis) to stand up.
//
// This deliberately lives in regular server-action/route-handler code, not
// in Next.js middleware/proxy: empirically, proxy's module-level state does
// not reliably persist across requests here (verified in both dev and a
// production `next start` build — even a limit of 2 never triggered),
// while this app's other module-level caches (TMDB/IGDB genre lists) do
// persist correctly when read from ordinary server actions. Hooking into
// the auth guard — which every protected page and server action already
// calls — gets the same blanket coverage middleware would have given.
interface Bucket {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 60_000;
const MAX_TRACKED_KEYS = 5000;

const buckets = new Map<string, Bucket>();

function sweepExpired(now: number) {
  if (buckets.size < MAX_TRACKED_KEYS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}

async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

export class RateLimitError extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Too many requests — slow down and try again in a moment.");
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/** Throws RateLimitError if this bucket (scoped by name + caller IP) is over limit. */
export async function enforceRateLimit(bucketName: string, limit: number): Promise<void> {
  const now = Date.now();
  const key = `${bucketName}:${await clientIp()}`;

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(key, bucket);
  }
  bucket.count++;
  sweepExpired(now);

  if (bucket.count > limit) {
    throw new RateLimitError(Math.ceil((bucket.resetAt - now) / 1000));
  }
}
