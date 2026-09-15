/**
 * localStorage that never throws. Private windows, blocked site data and
 * thumbnail capture all make storage unavailable, so every call is guarded.
 */
const PREFIX = "nachash_";

export const storage = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  },
  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      /* storage unavailable — the game still plays, it just forgets */
    }
  },
};

export const bestKey = (modeId: string) => `best_${modeId}`;
