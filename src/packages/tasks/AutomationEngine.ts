export interface AutomationRule {
  id: string;
  when: string;
  then: string;
  enabled: boolean;
}

/**
 * Device + rule state for automations. Swappable for a real hub adapter
 * (Home Assistant, Matter) without touching skills.
 */
export class AutomationEngine {
  private devices = new Map<string, boolean>();
  private rules: AutomationRule[] = [];
  private listeners = new Set<() => void>();

  setDevice(name: string, on: boolean) {
    this.devices.set(name, on);
    this.listeners.forEach((l) => l());
  }

  deviceState(): { name: string; on: boolean }[] {
    return [...this.devices.entries()].map(([name, on]) => ({ name, on }));
  }

  addRule(when: string, then: string): AutomationRule {
    const rule = { id: crypto.randomUUID(), when, then, enabled: true };
    this.rules.push(rule);
    this.listeners.forEach((l) => l());
    return rule;
  }

  listRules() {
    return [...this.rules];
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

export const automationEngine = new AutomationEngine();
