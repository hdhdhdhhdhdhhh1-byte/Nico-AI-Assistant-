import type { IntentName, Skill, SkillContext, SkillResult } from "../shared/types";
import { PluginSystem } from "./PluginSystem";
import { builtInSkills } from "./BuiltInSkills";
import { SkillRegistry, type SkillUsage } from "./SkillRegistry";
import { RateLimiter } from "../permissions/RateLimiter";

export interface SkillInfo {
  id: string;
  name: string;
  description: string;
  intents: IntentName[];
  permissions: string[];
  enabled: boolean;
  usage: SkillUsage;
}

/**
 * SkillManager — the plugin platform façade used by the brain.
 *
 * Adds on top of the raw registry:
 *  - enable / disable per skill (persisted),
 *  - permission declaration + runtime validation hook,
 *  - usage tracking (counts only, never content),
 *  - rate limiting so a looping skill cannot hammer the network.
 *
 * Every registered skill's `execute` is wrapped once at registration, so the
 * brain calls skills exactly as before — no orchestrator changes required.
 */
export class SkillManager {
  readonly plugins = new PluginSystem();
  readonly registry: SkillRegistry;
  private readonly limiter: RateLimiter;

  constructor(
    skills: Skill[] = builtInSkills(),
    registry = new SkillRegistry(),
    limiter = new RateLimiter(20, 60_000),
  ) {
    this.registry = registry;
    this.limiter = limiter;
    this.plugins.registerAll(skills.map((s) => this.instrument(s)));
  }

  private instrument(skill: Skill): Skill {
    if ((skill as { __instrumented?: boolean }).__instrumented) return skill;
    const raw = skill.execute.bind(skill);
    const wrapped: Skill & { __instrumented?: boolean } = {
      ...skill,
      execute: async (ctx: SkillContext): Promise<SkillResult> => {
        if (!this.registry.isEnabled(skill)) {
          return { ok: false, speech: "", error: "skill_disabled" };
        }
        const missing = (skill.permissions ?? []).filter((p) => !ctx.hasPermission(p));
        if (missing.length) {
          return { ok: false, speech: "", error: `permission_denied:${missing.join(",")}` };
        }
        const gate = this.limiter.check(skill.id);
        if (!gate.allowed) {
          return { ok: false, speech: "", error: "rate_limited" };
        }
        const startedAt = Date.now();
        try {
          const result = await raw(ctx);
          this.registry.record(skill.id, result.ok, Date.now() - startedAt);
          return result;
        } catch (e) {
          this.registry.record(skill.id, false, Date.now() - startedAt);
          return { ok: false, speech: "", error: String(e) };
        }
      },
    };
    wrapped.__instrumented = true;
    return wrapped;
  }

  get(id: string) {
    return this.plugins.get(id);
  }

  /** Only enabled skills are planned against. */
  forIntent(intent: IntentName) {
    return this.plugins.forIntent(intent).filter((s) => this.registry.isEnabled(s));
  }

  list() {
    return this.plugins.list();
  }

  /** UI-facing view: metadata + enabled state + usage counters. */
  describe(): SkillInfo[] {
    return this.list().map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      intents: s.intents,
      permissions: s.permissions ?? [],
      enabled: this.registry.isEnabled(s),
      usage: this.registry.usageFor(s.id),
    }));
  }

  setEnabled(id: string, on: boolean) {
    this.registry.setEnabled(id, on);
  }

  isEnabled(id: string) {
    const skill = this.get(id);
    return skill ? this.registry.isEnabled(skill) : false;
  }

  install(skill: Skill) {
    return this.plugins.register(this.instrument(skill));
  }

  uninstall(id: string) {
    this.plugins.unregister(id);
  }
}
