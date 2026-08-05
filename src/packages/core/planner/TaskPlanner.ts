import type { PermissionKey } from "../../shared/types";
import type { AgentPlan, AgentPlanStep, RichIntent } from "../../shared/agent";
import type { SkillManager } from "../../skills/SkillManager";
import type { AdvancedIntentEngine } from "../intent/AdvancedIntentEngine";

/**
 * Planning Engine.
 * Breaks a possibly-compound request into an ordered, dependency-aware set of
 * steps. "ذكرني بكرة وأرسل رسالة" becomes: create reminder → prepare message →
 * execute action.
 */
export class TaskPlanner {
  constructor(
    private readonly skills: SkillManager,
    private readonly intents: AdvancedIntentEngine,
  ) {}

  plan(intent: RichIntent): AgentPlan {
    const steps: AgentPlanStep[] = [];
    let order = 0;
    let previousId: string | null = null;

    for (const segment of intent.segments) {
      const sub = segment === intent.raw ? intent : this.intents.classifySegment(segment);
      const matched = this.skills.forIntent(sub.name);

      for (const skill of matched) {
        const id = `${skill.id}-${order}`;
        steps.push({
          id,
          order,
          skill: skill.id,
          description: skill.description,
          category: sub.category,
          input: { ...sub.entities, text: segment },
          dependsOn: previousId ? [previousId] : [],
          requiresPermissions: skill.permissions ?? [],
          optional: sub.category === "conversation",
        });
        previousId = id;
        order++;
      }
    }

    const requiresPermissions = steps
      .flatMap((s) => s.requiresPermissions)
      .filter((p, i, arr): p is PermissionKey => arr.indexOf(p) === i);

    return {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `plan-${Date.now().toString(36)}`,
      goal: intent.raw,
      steps,
      requiresMemory:
        intent.category === "personal_info" ||
        steps.some((s) => s.category === "personal_info") ||
        intent.name === "memory_recall" ||
        intent.name === "memory_store",
      requiresPermissions,
    };
  }

  /** Topologically ordered steps whose dependencies all succeeded. */
  runnable(plan: AgentPlan, completed: Set<string>): AgentPlanStep[] {
    return [...plan.steps]
      .sort((a, b) => a.order - b.order)
      .filter((s) =>
        s.dependsOn.every((d) => completed.has(d) || !plan.steps.some((p) => p.id === d)),
      );
  }
}
