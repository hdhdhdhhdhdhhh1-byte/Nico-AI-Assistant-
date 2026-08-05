/**
 * OfflineManager — glue between the OfflineStore snapshot, the
 * CommandQueue, and the runtime.
 *
 * Design goals:
 *  - Offline-first read: hydrate UI from cache instantly, then refresh
 *    from Supabase when the network answers.
 *  - Never lose a command: anything the user says while offline is queued
 *    and replayed FIFO after `online` fires.
 *  - No new backend: Supabase is still the source of truth. Cache is a
 *    fallback, not a fork.
 */
import { CommandQueue, type QueuedCommand } from "./CommandQueue";
import { OfflineStore, type CachedTurn, type OfflineSnapshot } from "./OfflineStore";

type Replay = (command: QueuedCommand) => Promise<void>;

export interface OfflineManagerOptions {
  /** How to replay a queued command once the network is back. */
  replay: Replay;
  /** Max attempts before dropping a stuck command. */
  maxAttempts?: number;
}

export class OfflineManager {
  private online = typeof navigator === "undefined" ? true : navigator.onLine;
  private draining = false;
  private listeners = new Set<(online: boolean) => void>();
  private cleanup: Array<() => void> = [];

  constructor(private readonly opts: OfflineManagerOptions) {
    if (typeof window === "undefined") return;
    const on = () => this.setOnline(true);
    const off = () => this.setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    this.cleanup.push(() => window.removeEventListener("online", on));
    this.cleanup.push(() => window.removeEventListener("offline", off));
  }

  dispose() {
    this.cleanup.forEach((fn) => fn());
    this.cleanup = [];
    this.listeners.clear();
  }

  isOnline() {
    return this.online;
  }

  snapshot(): OfflineSnapshot {
    return OfflineStore.read();
  }

  cacheTurn(turn: CachedTurn) {
    OfflineStore.appendTurn(turn);
  }

  cacheSettings(settings: Record<string, unknown>) {
    OfflineStore.write({ settings });
  }

  cacheMemories(memories: unknown[]) {
    OfflineStore.write({ memories });
  }

  /** Enqueue a user command that could not be processed right now. */
  enqueue(text: string) {
    return CommandQueue.enqueue(text);
  }

  pendingCount() {
    return CommandQueue.size();
  }

  subscribe(fn: (online: boolean) => void) {
    this.listeners.add(fn);
    fn(this.online);
    return () => this.listeners.delete(fn);
  }

  /** Manually kick a drain (also called automatically on `online`). */
  async flush(): Promise<{ replayed: number; dropped: number }> {
    if (this.draining || !this.online) return { replayed: 0, dropped: 0 };
    this.draining = true;
    let replayed = 0;
    let dropped = 0;
    const max = this.opts.maxAttempts ?? 3;
    try {
      for (const cmd of CommandQueue.all()) {
        try {
          await this.opts.replay(cmd);
          CommandQueue.remove(cmd.id);
          replayed++;
        } catch {
          CommandQueue.bumpAttempts(cmd.id);
          if (cmd.attempts + 1 >= max) {
            CommandQueue.remove(cmd.id);
            dropped++;
          }
        }
      }
    } finally {
      this.draining = false;
    }
    return { replayed, dropped };
  }

  private setOnline(next: boolean) {
    if (this.online === next) return;
    this.online = next;
    this.listeners.forEach((fn) => fn(next));
    if (next) void this.flush();
  }
}
