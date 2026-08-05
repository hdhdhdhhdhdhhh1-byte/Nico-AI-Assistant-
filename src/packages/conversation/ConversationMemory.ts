import type { ConversationTurn, IntentName } from "../shared/types";
import type { Topic } from "../shared/agent";

const TOPIC_LABELS: Partial<Record<IntentName, string>> = {
  weather: "الطقس",
  calendar: "المواعيد",
  reminder: "التذكيرات",
  search: "البحث",
  smart_home: "المنزل الذكي",
  memory_store: "الذاكرة",
  memory_recall: "الذاكرة",
  question: "سؤال",
  greeting: "ترحيب",
  smalltalk: "حديث عام",
  unknown: "غير محدد",
};

/**
 * Conversation-scoped memory: the ordered turn log plus the topics those
 * turns belong to. Distinct from `@nico/memory` — this layer is about the
 * *dialogue*, not about facts worth persisting.
 */
export class ConversationMemory {
  private turns: ConversationTurn[] = [];
  private topicList: Topic[] = [];

  constructor(private readonly windowSize = 24) {}

  record(turn: ConversationTurn) {
    this.turns.push(turn);
    if (this.turns.length > this.windowSize) this.turns = this.turns.slice(-this.windowSize);
    if (turn.role === "user" && turn.intent) this.touchTopic(turn.intent, {});
  }

  /** Creates or refreshes the topic bound to an intent. */
  touchTopic(intent: IntentName, entities: Record<string, string>): Topic {
    const existing = this.topicList.find((t) => t.intent === intent);
    if (existing) {
      existing.turns += 1;
      existing.lastSeenAt = Date.now();
      existing.entities = { ...existing.entities, ...entities };
      this.promote(existing);
      return existing;
    }
    const topic: Topic = {
      id: `${intent}-${Date.now().toString(36)}`,
      label: TOPIC_LABELS[intent] ?? intent,
      intent,
      entities,
      turns: 1,
      lastSeenAt: Date.now(),
    };
    this.topicList.unshift(topic);
    this.topicList = this.topicList.slice(0, 8);
    return topic;
  }

  private promote(topic: Topic) {
    this.topicList = [topic, ...this.topicList.filter((t) => t.id !== topic.id)];
  }

  activeTopic(): Topic | undefined {
    return this.topicList[0];
  }

  topics(): Topic[] {
    return [...this.topicList];
  }

  history(): ConversationTurn[] {
    return [...this.turns];
  }

  lastUserTurn(): ConversationTurn | undefined {
    return [...this.turns].reverse().find((t) => t.role === "user");
  }

  /** Compact transcript handed to the reasoning model. */
  transcript(limit = 8): string {
    return this.turns
      .slice(-limit)
      .map((t) => `${t.role === "user" ? "المستخدم" : "نيكو"}: ${t.content}`)
      .join("\n");
  }

  clear() {
    this.turns = [];
    this.topicList = [];
  }
}
