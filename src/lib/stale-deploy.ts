"use client";

// Errors that mean this tab is running JS from an older deploy: the chunk
// or Server Action it's asking for no longer exists on the server.
const STALE_PATTERNS = [
  /ChunkLoadError/i,
  /Loading chunk [\w-]+ failed/i,
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /Failed to find Server Action/i,
  /Server Action .* was not found/i,
];

const RELOAD_KEY = "playd:stale-reload-at";
const RELOAD_COOLDOWN_MS = 30_000;

export function isStaleDeployError(error: Error): boolean {
  const text = `${error.name} ${error.message}`;
  return STALE_PATTERNS.some((re) => re.test(text));
}

/**
 * Hard-reloads once to pick up the current deploy. Returns false (and does
 * nothing) if we already reloaded in the last 30s, so a genuinely broken
 * page can't loop forever.
 */
export function reloadOnceForStaleDeploy(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    if (Date.now() - last < RELOAD_COOLDOWN_MS) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // sessionStorage unavailable: still reload, the cooldown is best-effort.
  }
  window.location.reload();
  return true;
}
