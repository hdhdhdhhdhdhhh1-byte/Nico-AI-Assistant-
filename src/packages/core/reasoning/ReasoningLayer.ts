import type { PermissionManager } from "../../permissions/PermissionManager";
import { SecurityLayer } from "../../permissions/SecurityLayer";
import type { SkillManager } from "../../skills/SkillManager";
import type {
  AgentPlan,
  AgentPlanStep,
  ReasoningDecision,
  ResponseStyle,
  RichIntent,
} from "../../shared/agent";
import type { PermissionKey } from "../../shared/types";

export interface ReasoningInputs {
  intent: RichIntent;
  plan: AgentPlan;
  hasMemory: boolean;
}

/**
 * Reasoning Layer.
 * Decides — before anything runs — which steps are allowed to execute,
 * whether memory is involved, whether the model is needed, and in which
 * style Nico should answer.
 */
export class ReasoningLayer {
  private readonly security: SecurityLayer;

  constructor(
    permissions: PermissionManager,
    private readonly skills: SkillManager,
  ) {
    this.security = new SecurityLayer(permissions);
  }

  decide({ intent, plan, hasMemory }: ReasoningInputs): ReasoningDecision {
    const rationale: string[] = [];
    const executable: AgentPlanStep[] = [];
    const blocked: { step: AgentPlanStep; missing: PermissionKey[] }[] = [];

    for (const step of [...plan.steps].sort((a, b) => a.order - b.order)) {
      const skill = this.skills.get(step.skill);
      if (!skill) {
        rationale.push(`تجاهلت خطوة ${step.skill}: المهارة غير مسجلة.`);
        continue;
      }
      const decision = this.security.authorize(skill);
      if (!decision.allowed) {
        blocked.push({ step, missing: decision.missing });
        rationale.push(`أوقفت ${skill.name}: صلاحيات ناقصة (${decision.missing.join(", ")}).`);
        continue;
      }
      executable.push(step);
      rationale.push(`اخترت ${skill.name} للخطوة ${step.order + 1}.`);
    }

    const needsMemoryRecall =
      intent.name === "memory_recall" ||
      intent.category === "personal_info" ||
      (intent.isReference && hasMemory);
    const needsMemoryWrite = intent.name === "memory_store" || intent.category === "personal_info";
    const needsModel = executable.length === 0 || intent.category !== "command";

    if (needsMemoryRecall) rationale.push("استرجعت الذاكرة الطويلة قبل الرد.");
    if (!needsModel) rationale.push("الأمر تنفيذي مباشر، لا حاجة لاستدعاء النموذج.");

    return {
      plan,
      executable,
      blocked,
      needsMemoryRecall,
      needsMemoryWrite,
      needsModel,
      style: this.style(intent, blocked.length > 0),
      rationale,
    };
  }

  private style(intent: RichIntent, hasBlocked: boolean): ResponseStyle {
    if (hasBlocked) return "empathetic";
    switch (intent.category) {
      case "command":
      case "task_execution":
        return "confirming";
      case "question":
      case "search":
        return "informative";
      case "personal_info":
      case "reminder":
        return "brief";
      default:
        return intent.name === "greeting" ? "playful" : "brief";
    }
  }

  /** Redacts sensitive spans before any text reaches the model. */
  sanitize(text: string) {
    return this.security.sanitizeForModel(text);
  }
}
