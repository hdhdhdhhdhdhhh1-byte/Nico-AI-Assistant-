import type { Intent, PermissionKey, Plan, PlanStep } from "../shared/types";
import type { SkillManager } from "../skills/SkillManager";

/** Turns an intent into an ordered, permission-aware execution plan. */
export class Planner {
  constructor(private readonly skills: SkillManager) {}

  plan(intent: Intent): Plan {
    const matched = this.skills.forIntent(intent.name);
    const steps: PlanStep[] = matched.map((skill, i) => ({
      id: `${skill.id}-${i}`,
      skill: skill.id,
      input: { ...intent.entities, text: intent.raw },
      description: skill.description,
    }));

    const requiresPermissions = matched
      .flatMap((s) => s.permissions ?? [])
      .filter((p, i, arr): p is PermissionKey => arr.indexOf(p) === i);

    return {
      steps,
      requiresMemory: intent.name === "memory_recall" || intent.name === "memory_store",
      requiresPermissions,
    };
  }
}
