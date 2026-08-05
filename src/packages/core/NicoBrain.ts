import { ConversationEngine } from "../conversation";
import { IntentEngine } from "./IntentEngine";
import { Planner } from "./Planner";
import { LocalAIEngine } from "@/lib/ai/LocalAIEngine";
import type { SkillManager } from "../skills/SkillManager";
import type { AgentResponse, ExecutionRecord, SkillResult, SkillContext } from "../shared/types";

export interface BrainDeps {
  memory?: unknown;
  skills?: SkillManager;
  permissions?: unknown;
  [key: string]: unknown;
}

export class NicoBrain {
  public readonly conversation: ConversationEngine;
  private intentEngine: IntentEngine;
  private planner: Planner | null = null;
  private deps: BrainDeps;

  constructor(deps: BrainDeps) {
    this.deps = deps;
    this.conversation = new ConversationEngine();
    this.intentEngine = new IntentEngine();
    if (deps.skills) {
      this.planner = new Planner(deps.skills);
    }
  }

  async handle(transcript: string): Promise<AgentResponse> {
    console.log("[NicoBrain] Processing local handle:", transcript);
    const startedAt = Date.now();
    const { memory, skills, permissions } = this.deps;

    // 1. Local Intent Detection & Entity Extraction
    const intent = this.intentEngine.detect(transcript);

    // 2. Build Memory Digest for Context
    let memoryDigest = "";
    try {
      if (memory?.longTerm) {
        const storedMemories = memory.longTerm.all().slice(0, 5);
        if (storedMemories.length > 0) {
          memoryDigest = storedMemories.map((m: any) => `${m.key}: ${m.value}`).join("\n");
        }
      }
    } catch {
      // ignore
    }

    // 3. Skill Execution via Planner
    const skillResults: SkillResult[] = [];
    const executions: ExecutionRecord[] = [];
    let skillSpeech = "";

    if (skills) {
      const matchedSkills = skills.forIntent(intent.name);
      for (const skill of matchedSkills) {
        const skillCtx: SkillContext = {
          intent,
          history: memory?.shortTerm?.history?.() ?? [],
          userName: memory?.profile?.data?.name,
          hasPermission: (p) => permissions?.get?.(p) === "granted",
          remember: (rec) => memory?.longTerm?.write?.(rec),
          recall: (q) => memory?.longTerm?.search?.(q) ?? [],
        };

        try {
          const res = await skill.execute(skillCtx);
          skillResults.push(res);
          executions.push({
            stepId: skill.id,
            skill: skill.id,
            ok: res.ok,
            durationMs: 10,
            error: res.error,
          });

          if (res.ok && res.speech) {
            skillSpeech = res.speech;
          }
        } catch (e) {
          console.warn(`[NicoBrain] Skill ${skill.id} execution failed:`, e);
        }
      }
    }

    // 4. Local AI Engine Reasoning & Fallback
    const localResult = LocalAIEngine.processThink({
      transcript,
      memoryDigest,
      userName: memory?.profile?.data?.name,
    });

    // 5. Memory Writing
    let memoriesWrittenCount = 0;
    if (localResult.memories && localResult.memories.length > 0 && memory?.longTerm) {
      for (const m of localResult.memories) {
        try {
          memory.longTerm.write({ key: m.key, value: m.value, kind: m.kind });
          memoriesWrittenCount++;
        } catch (e) {
          console.warn("[NicoBrain] Failed to write memory:", e);
        }
      }
    }

    // Determine final speech response
    const finalSpeech = skillSpeech || localResult.speech || "أهلاً بك، كيف يمكنني مساعدتك؟";

    // 6. Record turns in ShortTermMemory
    try {
      if (memory?.shortTerm) {
        memory.shortTerm.push({
          id: crypto.randomUUID(),
          role: "user",
          content: transcript,
          createdAt: Date.now(),
          intent: intent.name,
        });
        memory.shortTerm.push({
          id: crypto.randomUUID(),
          role: "nico",
          content: finalSpeech,
          createdAt: Date.now(),
          intent: intent.name,
        });
      }
    } catch {
      // ignore
    }

    return {
      transcript,
      intent: intent as any,
      plan: { steps: [], requiresMemory: true, requiresPermissions: [] },
      speech: finalSpeech,
      skillResults,
      memoriesWritten: memoriesWrittenCount,
      emotion: "neutral",
      learning: false,
      trace: {
        sessionId: "local-session",
        intent: intent as any,
        decision: {} as any,
        executions,
        memoriesWritten: memoriesWrittenCount,
        durationMs: Date.now() - startedAt,
      },
    };
  }
}
