import { describe, expect, it } from "vitest";
import { AdvancedIntentEngine } from "@/packages/core/intent";
import { TaskPlanner } from "@/packages/core/planner";
import { ReasoningLayer } from "@/packages/core/reasoning";
import { SkillManager } from "@/packages/skills/SkillManager";
import { PermissionManager } from "@/packages/permissions/PermissionManager";

const intents = new AdvancedIntentEngine();
const skills = new SkillManager();
const planner = new TaskPlanner(skills, intents);

describe("TaskPlanner", () => {
  it("breaks a compound request into ordered dependent steps", () => {
    const plan = planner.plan(intents.classify("ذكرني بكرة بالاجتماع وأرسل رسالة للفريق"));
    expect(plan.steps.length).toBeGreaterThanOrEqual(1);
    expect(plan.steps[0].order).toBe(0);
    plan.steps.slice(1).forEach((s, i) => expect(s.dependsOn).toContain(plan.steps[i].id));
  });

  it("flags memory-bound plans", () => {
    expect(planner.plan(intents.classify("تذكر أن لوني المفضل أزرق")).requiresMemory).toBe(true);
  });

  it("collects required permissions", () => {
    const plan = planner.plan(intents.classify("ذكرني بعد 5 دقائق"));
    expect(plan.requiresPermissions).toContain("notifications");
  });
});

describe("ReasoningLayer", () => {
  it("blocks steps whose permissions are missing", () => {
    const permissions = new PermissionManager();
    const layer = new ReasoningLayer(permissions, skills);
    const intent = intents.classify("ذكرني بعد 5 دقائق بالاجتماع");
    const decision = layer.decide({ intent, plan: planner.plan(intent), hasMemory: false });
    expect(decision.blocked.length).toBeGreaterThan(0);
    expect(decision.executable.length).toBe(0);
  });

  it("executes when permission is granted and picks a confirming style", () => {
    const permissions = new PermissionManager();
    permissions.set("files", "granted");
    const layer = new ReasoningLayer(permissions, skills);
    const intent = intents.classify("شغل الإضاءة");
    const decision = layer.decide({ intent, plan: planner.plan(intent), hasMemory: false });
    expect(decision.executable.length).toBeGreaterThan(0);
    expect(decision.style).toBe("confirming");
  });

  it("marks memory needs for personal information", () => {
    const layer = new ReasoningLayer(new PermissionManager(), skills);
    const intent = intents.classify("اسمي خالد");
    const decision = layer.decide({ intent, plan: planner.plan(intent), hasMemory: true });
    expect(decision.needsMemoryWrite).toBe(true);
  });

  it("redacts sensitive spans before the model", () => {
    const layer = new ReasoningLayer(new PermissionManager(), skills);
    expect(layer.sanitize("بطاقتي 4111111111111111")).toContain("[رقم محجوب]");
  });
});
