export interface AutomationSchedule {
  id: string;
  /** Human label shown in settings. */
  label: string;
  /** 24h local time, "07:00". */
  time: string;
  /** 0 = Sunday … 6 = Saturday. Empty = every day. */
  days: number[];
  enabled: boolean;
  /** Action key resolved by the host app (e.g. "daily_briefing"). */
  action: string;
  lastRunAt?: number;
}

type Handler = (schedule: AutomationSchedule) => void | Promise<void>;

const KEY = "nico.automation.v1";

const DEFAULTS: AutomationSchedule[] = [
  {
    id: "daily_briefing",
    label: "إحاطة الصباح",
    time: "07:00",
    days: [],
    enabled: false,
    action: "daily_briefing",
  },
];

/**
 * Task Automation Engine — recurring, time-of-day triggers evaluated in the
 * foreground (web) and by the Android foreground service (mobile).
 * Actions are resolved by the host so no business logic lives here.
 */
export class TaskAutomation {
  private schedules: AutomationSchedule[] = [];
  private handlers = new Map<string, Handler>();
  private listeners = new Set<(s: AutomationSchedule[]) => void>();
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.schedules = this.load();
  }

  private load(): AutomationSchedule[] {
    if (typeof window === "undefined") return [...DEFAULTS];
    try {
      const raw = window.localStorage.getItem(KEY);
      const stored = raw ? (JSON.parse(raw) as AutomationSchedule[]) : [];
      const merged = [...DEFAULTS];
      for (const s of stored) {
        const i = merged.findIndex((m) => m.id === s.id);
        if (i >= 0) merged[i] = { ...merged[i], ...s };
        else merged.push(s);
      }
      return merged;
    } catch {
      return [...DEFAULTS];
    }
  }

  private persist() {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(KEY, JSON.stringify(this.schedules));
      } catch {
        /* quota */
      }
    }
    const snapshot = this.list();
    this.listeners.forEach((l) => l(snapshot));
  }

  list(): AutomationSchedule[] {
    return this.schedules.map((s) => ({ ...s }));
  }

  register(action: string, handler: Handler) {
    this.handlers.set(action, handler);
    return () => this.handlers.delete(action);
  }

  add(schedule: Omit<AutomationSchedule, "id">): AutomationSchedule {
    const created: AutomationSchedule = { ...schedule, id: crypto.randomUUID() };
    this.schedules.push(created);
    this.persist();
    return created;
  }

  update(id: string, patch: Partial<AutomationSchedule>) {
    const s = this.schedules.find((x) => x.id === id);
    if (!s) return null;
    Object.assign(s, patch);
    this.persist();
    return { ...s };
  }

  remove(id: string) {
    this.schedules = this.schedules.filter((s) => s.id !== id);
    this.persist();
  }

  start() {
    if (this.timer || typeof window === "undefined") return () => {};
    this.timer = setInterval(() => void this.tick(), 30_000);
    void this.tick();
    return () => this.stop();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Runs any schedule whose local time has arrived (once per day). */
  async tick(now = new Date()) {
    const [nowH, nowM] = [now.getHours(), now.getMinutes()];
    for (const s of this.schedules) {
      if (!s.enabled) continue;
      if (s.days.length && !s.days.includes(now.getDay())) continue;
      const [h, m] = s.time.split(":").map(Number);
      if (Number.isNaN(h) || Number.isNaN(m)) continue;
      const dueMinutes = h * 60 + m;
      const nowMinutes = nowH * 60 + nowM;
      if (nowMinutes < dueMinutes || nowMinutes > dueMinutes + 5) continue;
      if (s.lastRunAt && new Date(s.lastRunAt).toDateString() === now.toDateString()) continue;
      s.lastRunAt = now.getTime();
      this.persist();
      await this.handlers.get(s.action)?.(s);
    }
  }

  subscribe(fn: (s: AutomationSchedule[]) => void) {
    this.listeners.add(fn);
    fn(this.list());
    return () => this.listeners.delete(fn);
  }
}

export const taskAutomation = new TaskAutomation();
