import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";

// This is the actual credential-processing endpoint (sign-in, sign-up,
// session checks) — the one surface in this app genuinely worth rate
// limiting before auth even runs, since it's reachable with no session at
// all (credential stuffing / signup spam).
const AUTH_LIMIT = 20;

const handlers = auth.handler();

async function rateLimitOrNull(): Promise<Response | null> {
  try {
    await enforceRateLimit("auth", AUTH_LIMIT);
    return null;
  } catch (err) {
    if (err instanceof RateLimitError) {
      return NextResponse.json(
        { error: err.message },
        { status: 429, headers: { "Retry-After": String(err.retryAfterSeconds) } },
      );
    }
    throw err;
  }
}

export async function GET(...args: Parameters<typeof handlers.GET>) {
  return (await rateLimitOrNull()) ?? handlers.GET(...args);
}

export async function POST(...args: Parameters<typeof handlers.POST>) {
  return (await rateLimitOrNull()) ?? handlers.POST(...args);
}
