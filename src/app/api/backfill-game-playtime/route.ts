import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { games } from "@/db/schema";
import { requireAllowedUserOrThrow } from "@/lib/auth/guard";
import { getGameTimesToBeat } from "@/lib/igdb";

// One-off: fill runtime_minutes for games added before playtime was stored.
// Visit /api/backfill-game-playtime while signed in. Safe to re-run.
export async function GET() {
  let user;
  try {
    user = await requireAllowedUserOrThrow();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const missing = await db
    .select({ id: games.id, sourceId: games.sourceId })
    .from(games)
    .where(and(eq(games.userId, user.id), isNull(games.runtimeMinutes)));

  const times = await getGameTimesToBeat(missing.map((g) => g.sourceId));

  let updated = 0;
  for (const g of missing) {
    const minutes = times.get(g.sourceId);
    if (minutes == null) continue;
    await db.update(games).set({ runtimeMinutes: minutes }).where(eq(games.id, g.id));
    updated++;
  }

  return NextResponse.json({ checked: missing.length, updated });
}
