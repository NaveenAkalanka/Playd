// App-wide "last active" bookkeeping for the Discover popup's
// "reopen after an hour of inactivity" rule. Everything is best-effort:
// storage can be unavailable (private mode), in which case it just reads
// as "never active" and the popup behaves like a first visit.

export const IDLE_MS = 60 * 60 * 1000;
// Writing on every scroll/keypress is pointless — a minute's precision is
// plenty for an hour-long idle window.
const WRITE_THROTTLE_MS = 60 * 1000;

const LAST_ACTIVE_KEY = "playd:last-active";
const RESUMED_AT_KEY = "playd:resumed-after-idle";
export const RESUMED_EVENT = "playd:resumed-after-idle";

function readNumber(key: string): number {
  try {
    return Number(localStorage.getItem(key) ?? 0) || 0;
  } catch {
    return 0;
  }
}

function writeNumber(key: string, value: number) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Ignore — see the note at the top.
  }
}

/** When the user last came back after an hour or more away (0 = never). */
export function readResumedAt(): number {
  return readNumber(RESUMED_AT_KEY);
}

/**
 * Record activity. If the previous activity was over an hour ago, this
 * marks a "resumed after idle" moment and fires RESUMED_EVENT. Safe to call
 * from several places — it's idempotent within the throttle window.
 */
export function touchActivity(now = Date.now()) {
  const last = readNumber(LAST_ACTIVE_KEY);
  if (last && now - last < WRITE_THROTTLE_MS) return;

  if (last && now - last > IDLE_MS) {
    writeNumber(RESUMED_AT_KEY, now);
    window.dispatchEvent(new Event(RESUMED_EVENT));
  }
  writeNumber(LAST_ACTIVE_KEY, now);
}
