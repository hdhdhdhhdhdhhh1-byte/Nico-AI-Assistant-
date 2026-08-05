/**
 * CommandQueue — persists user commands issued while offline.
 *
 * The OfflineManager flushes the queue in FIFO order once the browser
 * reports it is back online. Commands are opaque strings; the runtime
 * decides how to replay them (usually by feeding each back into NicoBrain).
 */
export interface QueuedCommand {
  id: string;
  text: string;
  queuedAt: number;
  attempts: number;
}

const KEY = "nico.offline.queue.v1";

function readAll(): QueuedCommand[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as QueuedCommand[]) : [];
  } catch {
    return [];
  }
}

function persist(items: QueuedCommand[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

export const CommandQueue = {
  all(): QueuedCommand[] {
    return readAll();
  },
  size() {
    return readAll().length;
  },
  enqueue(text: string): QueuedCommand {
    const item: QueuedCommand = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : String(Date.now()) + Math.random().toString(16).slice(2),
      text,
      queuedAt: Date.now(),
      attempts: 0,
    };
    const items = readAll();
    items.push(item);
    persist(items);
    return item;
  },
  remove(id: string) {
    persist(readAll().filter((c) => c.id !== id));
  },
  bumpAttempts(id: string) {
    persist(readAll().map((c) => (c.id === id ? { ...c, attempts: c.attempts + 1 } : c)));
  },
  clear() {
    persist([]);
  },
};
