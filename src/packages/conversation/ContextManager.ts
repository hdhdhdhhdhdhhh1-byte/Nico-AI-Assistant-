import type { ConversationContextSnapshot, ResolvedReference } from "../shared/agent";
import type { ConversationMemory } from "./ConversationMemory";

/** Phrases that only make sense with prior context. */
const REFERENCE_PATTERNS: { re: RegExp; kind: "topic" | "last_action" }[] = [
  { re: /^\s*(و\s*)?(ماذا|شو|وش|ايش|إيش)\s+(عن|بخصوص)/i, kind: "topic" },
  { re: /^\s*what about\b/i, kind: "topic" },
  {
    re: /(كرره|كررها|أعدها|اعدها|مرة ثانية|مرة أخرى|again|do it again|repeat)/i,
    kind: "last_action",
  },
  { re: /^\s*(و\s*)?(بكرة|بكره|غدا|غداً|اليوم|tomorrow|today)\s*[?؟]?\s*$/i, kind: "topic" },
];

/**
 * Owns the *live* context of a conversation: which topic is active, what the
 * last executed action was, and how to turn an elliptical utterance into a
 * self-contained one before the intent engine ever sees it.
 */
export class ContextManager {
  private slots = new Map<string, string>();
  private lastAction?: { skill: string; input: Record<string, unknown>; at: number };

  constructor(
    private readonly memory: ConversationMemory,
    private readonly sessionId: () => string,
  ) {}

  setSlot(key: string, value: string) {
    this.slots.set(key, value);
  }

  getSlot(key: string) {
    return this.slots.get(key);
  }

  rememberAction(skill: string, input: Record<string, unknown>) {
    this.lastAction = { skill, input, at: Date.now() };
  }

  /** Expands references such as "وماذا عن بكرة؟" or "كررها" into full asks. */
  resolve(utterance: string): ResolvedReference {
    const text = utterance.trim();
    const match = REFERENCE_PATTERNS.find((p) => p.re.test(text));
    if (!match) return { text, resolved: false };

    if (match.kind === "last_action" && this.lastAction) {
      const original = String(this.lastAction.input.text ?? "");
      if (original) {
        return {
          text: original,
          resolved: true,
          source: "last_action",
          note: `إعادة تنفيذ ${this.lastAction.skill}`,
        };
      }
    }

    const topic = this.memory.activeTopic();
    if (topic) {
      const previous = this.memory.lastUserTurn()?.content ?? topic.label;
      return {
        text: `${previous} — ${text}`.trim(),
        resolved: true,
        source: "topic",
        note: `الموضوع النشط: ${topic.label}`,
      };
    }

    return { text, resolved: false };
  }

  snapshot(): ConversationContextSnapshot {
    return {
      sessionId: this.sessionId(),
      activeTopic: this.memory.activeTopic(),
      topics: this.memory.topics(),
      lastUserUtterance: this.memory.lastUserTurn()?.content,
      lastAction: this.lastAction,
      slots: Object.fromEntries(this.slots),
    };
  }

  /** Human-readable context block injected into the reasoning prompt. */
  digest(): string {
    const s = this.snapshot();
    const lines: string[] = [];
    if (s.activeTopic) lines.push(`الموضوع الحالي: ${s.activeTopic.label}`);
    if (s.lastAction) lines.push(`آخر إجراء: ${s.lastAction.skill}`);
    for (const [k, v] of Object.entries(s.slots)) lines.push(`${k}: ${v}`);
    return lines.join("\n");
  }

  clear() {
    this.slots.clear();
    this.lastAction = undefined;
  }
}
