import { describe, expect, it } from "vitest";
import { ResponseComposer } from "@/packages/core/response";
import { AdvancedIntentEngine } from "@/packages/core/intent";
import type { ReasoningDecision } from "@/packages/shared/agent";

const intents = new AdvancedIntentEngine();
const composer = new ResponseComposer();

function decision(partial: Partial<ReasoningDecision> = {}): ReasoningDecision {
  return {
    plan: { id: "p", goal: "", steps: [], requiresMemory: false, requiresPermissions: [] },
    executable: [],
    blocked: [],
    needsMemoryRecall: false,
    needsMemoryWrite: false,
    needsModel: true,
    style: "brief",
    rationale: [],
    ...partial,
  };
}

describe("ResponseComposer", () => {
  it("greets by name on the first turn", () => {
    const out = composer.compose({
      intent: intents.classify("مرحبا"),
      decision: decision({ style: "playful" }),
      reasoning: "كيف أقدر أساعدك؟",
      skillResults: [],
      firstTurn: true,
      userName: "خالد",
    });
    expect(out.speech).toContain("خالد");
    expect(out.voice.rate).toBeGreaterThan(1);
  });

  it("merges skill facts with reasoning", () => {
    const out = composer.compose({
      intent: intents.classify("كيف الطقس؟"),
      decision: decision({ style: "informative" }),
      reasoning: "خذ معك جاكيت.",
      skillResults: [{ ok: true, speech: "الجو 22 درجة." }],
      firstTurn: false,
    });
    expect(out.speech).toBe("الجو 22 درجة. خذ معك جاكيت.");
    expect(out.style).toBe("informative");
  });

  it("never returns empty speech", () => {
    const out = composer.compose({
      intent: intents.classify("..."),
      decision: decision(),
      reasoning: "",
      skillResults: [],
      firstTurn: false,
    });
    expect(out.speech.length).toBeGreaterThan(0);
  });
});
