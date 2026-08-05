import { ConversationMemory } from "./ConversationMemory";
import { ContextManager } from "./ContextManager";
import { SessionManager } from "./SessionManager";
import type { ConversationTurn, IntentName } from "../shared/types";
import type { ResolvedReference } from "../shared/agent";

export { ConversationMemory, ContextManager, SessionManager };

/**
 * Conversation Engine — the façade the brain talks to.
 * Session lifecycle + dialogue memory + reference resolution in one place.
 */
export class ConversationEngine {
  readonly memory: ConversationMemory;
  readonly session: SessionManager;
  readonly context: ContextManager;

  constructor(isGuest = true) {
    this.memory = new ConversationMemory();
    this.session = new SessionManager(isGuest);
    this.context = new ContextManager(this.memory, () => this.session.id());
  }

  /** Begins a turn: rotates stale sessions and expands references. */
  beginTurn(utterance: string): ResolvedReference {
    const rotated = this.session.touch();
    if (rotated) {
      this.memory.clear();
      this.context.clear();
    }
    return this.context.resolve(utterance);
  }

  record(turn: ConversationTurn) {
    this.memory.record(turn);
  }

  trackTopic(intent: IntentName, entities: Record<string, string>) {
    return this.memory.touchTopic(intent, entities);
  }

  reset() {
    this.memory.clear();
    this.context.clear();
    this.session.reset();
  }
}
