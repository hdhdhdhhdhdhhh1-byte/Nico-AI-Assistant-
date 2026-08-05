import type { Skill } from "../shared/types";

export interface SkillUsage {
  runs: number;
  failures: number;
  lastRunAt?: number;
  totalMs: number;
}

const STATE_KEY = "nico.skills.state.v1";
const USAGE_KEY = "nico.skills.usage.v1";

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota — state stays in-process */
  }
}

/**
 * SkillRegistry — enable/disable state + privacy-safe usage counters for the
 * plugin platform. Stores only skill ids and counts, never user content.
 */
export class SkillRegistry {
  private enabled: Record<string, boolean> = load(STATE_KEY, {});
  private usage: Record<string, SkillUsage> = load(USAGE_KEY, {});
  private listeners = new Set<() => void>();

  isEnabled(skill: Pick<Skill, "id"> & { enabledByDefault?: boolean }): boolean {
    const explicit = this.enabled[skill.id];
    if (typeof explicit === "boolean") return explicit;
    return skill.enabledByDefault ?? true;
  }

  setEnabled(id: string, on: boolean) {
    this.enabled[id] = on;
    save(STATE_KEY, this.enabled);
    this.emit();
  }

  toggle(id: string, current: boolean) {
    this.setEnabled(id, !current);
  }

  record(id: string, ok: boolean, durationMs: number) {
    const entry = this.usage[id] ?? { runs: 0, failures: 0, totalMs: 0 };
    entry.runs += 1;
    if (!ok) entry.failures += 1;
    entry.totalMs += Math.max(0, Math.round(durationMs));
    entry.lastRunAt = Date.now();
    this.usage[id] = entry;
    save(USAGE_KEY, this.usage);
    this.emit();
  }

  usageFor(id: string): SkillUsage {
    return this.usage[id] ?? { runs: 0, failures: 0, totalMs: 0 };
  }

  allUsage(): Record<string, SkillUsage> {
    return { ...this.usage };
  }

  resetUsage() {
    this.usage = {};
    save(USAGE_KEY, this.usage);
    this.emit();
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    this.listeners.forEach((l) => l());
  }
}
