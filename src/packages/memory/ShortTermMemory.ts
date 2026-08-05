import type { ConversationTurn } from "../shared/types";

/**
 * Volatile working memory: last turns + current context slots.
 * Never persisted for guests, mirrored to storage for signed-in profiles.
 */
export class ShortTermMemory {
  private turns: ConversationTurn[] = [];
  private slots = new Map<string, string>();

  constructor(private readonly windowSize = 12) {}

  push(turn: ConversationTurn) {
    this.turns.push(turn);
    if (this.turns.length > this.windowSize) {
      this.turns = this.turns.slice(-this.windowSize);
    }
  }

  history(): ConversationTurn[] {
    return [...this.turns];
  }

  setSlot(key: string, value: string) {
    this.slots.set(key, value);
  }

  getSlot(key: string) {
    return this.slots.get(key);
  }

  context(): string {
    return this.turns
      .map((t) => `${t.role === "user" ? "المستخدم" : "نيكو"}: ${t.content}`)
      .join("\n");
  }

  clear() {
    this.turns = [];
    this.slots.clear();
  }
}
