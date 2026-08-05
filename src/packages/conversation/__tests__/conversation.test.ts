import { describe, expect, it } from "vitest";
import { ConversationEngine } from "@/packages/conversation";

describe("ConversationEngine", () => {
  it("tracks the active topic", () => {
    const c = new ConversationEngine();
    c.beginTurn("كيف الطقس اليوم؟");
    c.trackTopic("weather", { city: "الرياض" });
    expect(c.memory.activeTopic()?.intent).toBe("weather");
    expect(c.memory.activeTopic()?.entities.city).toBe("الرياض");
  });

  it("resolves 'وماذا عن بكرة؟' using the previous utterance", () => {
    const c = new ConversationEngine();
    c.beginTurn("كيف الطقس اليوم؟");
    c.trackTopic("weather", {});
    c.record({
      id: "1",
      role: "user",
      content: "كيف الطقس اليوم؟",
      createdAt: Date.now(),
      intent: "weather",
    });
    const ref = c.beginTurn("وماذا عن بكرة؟");
    expect(ref.resolved).toBe(true);
    expect(ref.source).toBe("topic");
    expect(ref.text).toContain("الطقس");
  });

  it("replays the last action for 'كررها'", () => {
    const c = new ConversationEngine();
    c.beginTurn("شغل الإضاءة");
    c.context.rememberAction("smart_home", { text: "شغل الإضاءة" });
    const ref = c.beginTurn("كررها");
    expect(ref.source).toBe("last_action");
    expect(ref.text).toBe("شغل الإضاءة");
  });

  it("rotates an idle session and clears context", () => {
    const c = new ConversationEngine();
    const first = c.session.id();
    c.beginTurn("مرحبا");
    c.session.touch(Date.now() + 60 * 60 * 1000);
    expect(c.session.id()).not.toBe(first);
  });
});
