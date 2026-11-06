/**
 * Preference storage that never throws. Browsers can deny access to
 * localStorage entirely (the accessor itself throws) or reject writes when the
 * quota is exhausted. Values fall back to memory so the current session still
 * behaves correctly; a preference is never worth crashing the app over.
 */
const memory = new Map<string, string>();

export function readPreference(key: string): string | null {
  // Memory only holds values whose write failed, so it is the newest copy.
  const unsaved = memory.get(key);
  if (unsaved !== undefined) return unsaved;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writePreference(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
    memory.delete(key);
  } catch {
    memory.set(key, value);
  }
}

/** Test helper: clears in-memory fallbacks between cases. */
export function resetPreferenceMemory(): void {
  memory.clear();
}
