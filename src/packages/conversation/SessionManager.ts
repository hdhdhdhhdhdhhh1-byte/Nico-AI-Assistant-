import type { SessionInfo } from "../shared/agent";

const IDLE_MS = 30 * 60 * 1000;

/**
 * Tracks the lifetime of a conversation session. A session ends when the user
 * signs out, resets, or stays idle long enough that context is no longer safe
 * to reuse.
 */
export class SessionManager {
  private info: SessionInfo;
  private listeners = new Set<(s: SessionInfo) => void>();

  constructor(
    isGuest = true,
    private readonly idleMs = IDLE_MS,
  ) {
    this.info = this.fresh(isGuest);
  }

  private fresh(isGuest: boolean): SessionInfo {
    return {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `sess-${Date.now().toString(36)}`,
      startedAt: Date.now(),
      lastActivityAt: Date.now(),
      turns: 0,
      isGuest,
    };
  }

  current(): SessionInfo {
    return { ...this.info };
  }

  id() {
    return this.info.id;
  }

  isExpired(now = Date.now()) {
    return now - this.info.lastActivityAt > this.idleMs;
  }

  /** Marks activity, rotating the session when it went stale. Returns true on rotation. */
  touch(now = Date.now()): boolean {
    const rotated = this.isExpired(now);
    if (rotated) this.info = this.fresh(this.info.isGuest);
    this.info.lastActivityAt = now;
    this.info.turns += 1;
    this.emit();
    return rotated;
  }

  reset(isGuest = this.info.isGuest) {
    this.info = this.fresh(isGuest);
    this.emit();
    return this.current();
  }

  subscribe(fn: (s: SessionInfo) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    const snap = this.current();
    this.listeners.forEach((l) => l(snap));
  }
}
