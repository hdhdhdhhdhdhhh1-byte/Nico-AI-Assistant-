/**
 * OfflineStore — offline-first cache for Nico.
 *
 * Stores the last conversation turns, user settings, and a snapshot of
 * long-term memories in `localStorage` so the app boots and answers common
 * requests without a network. This does NOT replace Supabase; on reconnect
 * the runtime keeps writing to the cloud as before.
 */
export interface CachedTurn {
  role: "user" | "nico";
  content: string;
  at: number;
}

export interface OfflineSnapshot {
  turns: CachedTurn[];
  memories: unknown[];
  settings: Record<string, unknown>;
  updatedAt: number;
}

const KEY = "nico.offline.snapshot.v1";

function safeGet(): OfflineSnapshot {
  if (typeof window === "undefined") return empty();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return empty();
    return JSON.parse(raw) as OfflineSnapshot;
  } catch {
    return empty();
  }
}

function empty(): OfflineSnapshot {
  return { turns: [], memories: [], settings: {}, updatedAt: 0 };
}

export const OfflineStore = {
  read(): OfflineSnapshot {
    return safeGet();
  },
  write(patch: Partial<OfflineSnapshot>) {
    if (typeof window === "undefined") return;
    const next = { ...safeGet(), ...patch, updatedAt: Date.now() };
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* quota / private mode: ignore */
    }
  },
  clear() {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  },
  appendTurn(turn: CachedTurn, keep = 40) {
    const cur = safeGet();
    const turns = [...cur.turns, turn].slice(-keep);
    OfflineStore.write({ turns });
  },
};
