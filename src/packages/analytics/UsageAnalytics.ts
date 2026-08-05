export interface UsageSnapshot {
  conversations: number;
  messages: number;
  voiceMinutes: number;
  skillRuns: Record<string, number>;
  errors: number;
  lastErrorAt?: number;
  startedAt: number;
}

const KEY = "nico.analytics.v1";

const EMPTY = (): UsageSnapshot => ({
  conversations: 0,
  messages: 0,
  voiceMinutes: 0,
  skillRuns: {},
  errors: 0,
  startedAt: Date.now(),
});

type CloudSink = (event: { event_type: string; detail?: string }) => void;

/**
 * Privacy-respecting usage analytics.
 * Stores counters only — never transcripts, memories, or personal fields.
 * Cloud mirroring is opt-in and off by default.
 */
export class UsageAnalytics {
  private snapshot: UsageSnapshot;
  private sink: CloudSink | null = null;
  private cloudEnabled = false;
  private listeners = new Set<(s: UsageSnapshot) => void>();

  constructor() {
    this.snapshot = this.load();
  }

  private load(): UsageSnapshot {
    if (typeof window === "undefined") return EMPTY();
    try {
      const raw = window.localStorage.getItem(KEY);
      return raw ? { ...EMPTY(), ...(JSON.parse(raw) as UsageSnapshot) } : EMPTY();
    } catch {
      return EMPTY();
    }
  }

  private persist() {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(KEY, JSON.stringify(this.snapshot));
      } catch {
        /* quota */
      }
    }
    const s = this.get();
    this.listeners.forEach((l) => l(s));
  }

  /** Enable cloud mirroring of anonymous counters (explicit user consent). */
  configureCloud(sink: CloudSink | null, enabled: boolean) {
    this.sink = sink;
    this.cloudEnabled = enabled;
  }

  private mirror(event_type: string, detail?: string) {
    if (this.cloudEnabled && this.sink) this.sink({ event_type, detail });
  }

  conversationStarted() {
    this.snapshot.conversations += 1;
    this.persist();
    this.mirror("analytics_conversation");
  }

  messageExchanged(count = 1) {
    this.snapshot.messages += count;
    this.persist();
  }

  voiceTime(seconds: number) {
    this.snapshot.voiceMinutes = Number((this.snapshot.voiceMinutes + seconds / 60).toFixed(2));
    this.persist();
  }

  skillUsed(skillId: string) {
    this.snapshot.skillRuns[skillId] = (this.snapshot.skillRuns[skillId] ?? 0) + 1;
    this.persist();
    this.mirror("analytics_skill", skillId);
  }

  /** Technical errors only — the message is truncated and never includes content. */
  errorOccurred(code: string) {
    this.snapshot.errors += 1;
    this.snapshot.lastErrorAt = Date.now();
    this.persist();
    this.mirror("analytics_error", code.slice(0, 60));
  }

  get(): UsageSnapshot {
    return { ...this.snapshot, skillRuns: { ...this.snapshot.skillRuns } };
  }

  reset() {
    this.snapshot = EMPTY();
    this.persist();
  }

  subscribe(fn: (s: UsageSnapshot) => void) {
    this.listeners.add(fn);
    fn(this.get());
    return () => this.listeners.delete(fn);
  }
}

export const usageAnalytics = new UsageAnalytics();
