import type { IntentName, Skill } from "../shared/types";

/**
 * PluginSystem — the extension boundary.
 * Third-party skills register here; the brain is never modified.
 */
export class PluginSystem {
  private plugins = new Map<string, Skill>();
  private listeners = new Set<(skills: Skill[]) => void>();

  register(skill: Skill): () => void {
    if (this.plugins.has(skill.id)) {
      throw new Error(`Skill "${skill.id}" is already registered`);
    }
    this.plugins.set(skill.id, skill);
    this.emit();
    return () => this.unregister(skill.id);
  }

  registerAll(skills: Skill[]) {
    skills.forEach((s) => {
      if (!this.plugins.has(s.id)) this.plugins.set(s.id, s);
    });
    this.emit();
  }

  unregister(id: string) {
    this.plugins.delete(id);
    this.emit();
  }

  get(id: string): Skill | undefined {
    return this.plugins.get(id);
  }

  list(): Skill[] {
    return [...this.plugins.values()];
  }

  forIntent(intent: IntentName): Skill[] {
    return this.list().filter((s) => s.intents.includes(intent));
  }

  subscribe(fn: (skills: Skill[]) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    const snapshot = this.list();
    this.listeners.forEach((l) => l(snapshot));
  }
}
