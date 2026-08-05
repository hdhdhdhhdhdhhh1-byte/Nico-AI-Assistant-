import { describe, expect, it } from "vitest";
import { AdvancedIntentEngine } from "@/packages/core/intent";

const engine = new AdvancedIntentEngine();

describe("AdvancedIntentEngine", () => {
  it("classifies a question", () => {
    const r = engine.classify("ما هي عاصمة اليابان؟");
    expect(r.category).toBe("question");
  });

  it("classifies a command", () => {
    expect(engine.classify("أطفئ الإضاءة").category).toBe("command");
  });

  it("classifies a reminder", () => {
    const r = engine.classify("ذكرني بعد 10 دقائق بالاجتماع");
    expect(r.name).toBe("reminder");
    expect(r.category).toBe("reminder");
    expect(r.entities.amount).toBe("10");
  });

  it("classifies search and personal information", () => {
    expect(engine.classify("ابحث عن أفضل مطعم").category).toBe("search");
    expect(engine.classify("اسمي خالد").category).toBe("personal_info");
  });

  it("classifies plain conversation", () => {
    expect(engine.classify("مرحبا").category).toBe("conversation");
  });

  it("segments compound requests", () => {
    const r = engine.classify("ذكرني بكرة بالاجتماع وأرسل رسالة للفريق");
    expect(r.segments.length).toBeGreaterThan(1);
  });
});
