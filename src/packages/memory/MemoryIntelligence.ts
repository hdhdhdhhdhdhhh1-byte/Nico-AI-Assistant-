import type { MemoryImportance, MemoryKind, MemoryRetention } from "../shared/types";

export interface MemoryAnalysis {
  /** True when the utterance carries information worth remembering. */
  shouldConsider: boolean;
  /** Whether the info can be stored silently or needs a user confirmation. */
  needsConfirmation: boolean;
  importance: MemoryImportance;
  retention: MemoryRetention;
  suggestion?: {
    key: string;
    value: string;
    kind: MemoryKind;
  };
  /** Direct profile updates (e.g. name detected). */
  profilePatch?: { name?: string; preferredName?: string };
  reason: string;
}

const NAME_RE = /(?:اسمي|أنا اسمي|my name is|call me)\s+([\u0600-\u06FFA-Za-z]+)/i;
const CALL_ME_RE = /(?:نادني(?:\s+يا)?|call me)\s+([\u0600-\u06FFA-Za-z]+)/i;
const EXPLICIT_STORE_RE = /(?:^|\b)(?:احفظ|خزن|تذكر أن|remember that|save that|ملاحظة)\b/i;
const PREFERENCE_RE = /(?:أحب|احب|أفضل|افضل|أكره|اكره|i (?:like|love|prefer|hate))/i;
const INTEREST_RE = /(?:هوايتي|اهتمامي|مهتم ب|i'?m interested in)/i;
const HABIT_RE = /(?:عادتي|دائماً|كل يوم|every day|usually|i always)/i;
const DATE_RE = /(?:عيد ميلادي|ذكرى|موعد مهم|my birthday|anniversary)/i;
const TRANSIENT_RE = /(?:الجو|الطقس|weather|الساعة الآن|what time is it|كم الساعة|أخبار اليوم)/i;

/**
 * Memory Intelligence Engine.
 *
 * Analyzes a user utterance BEFORE writing to memory:
 *  - decides whether it is worth keeping,
 *  - sets its importance and retention,
 *  - flags when the user's explicit confirmation is required.
 */
export class MemoryIntelligence {
  analyze(utterance: string): MemoryAnalysis {
    const text = utterance.trim();
    if (!text) {
      return {
        shouldConsider: false,
        needsConfirmation: false,
        importance: "low",
        retention: "session",
        reason: "empty",
      };
    }

    // 1. Direct profile signals — silent save.
    const nameMatch = text.match(NAME_RE);
    if (nameMatch) {
      return {
        shouldConsider: true,
        needsConfirmation: false,
        importance: "high",
        retention: "permanent",
        suggestion: { key: "name", value: nameMatch[1], kind: "profile" },
        profilePatch: { name: nameMatch[1] },
        reason: "identity",
      };
    }
    const callMe = text.match(CALL_ME_RE);
    if (callMe) {
      return {
        shouldConsider: true,
        needsConfirmation: false,
        importance: "high",
        retention: "permanent",
        suggestion: { key: "preferredName", value: callMe[1], kind: "profile" },
        profilePatch: { preferredName: callMe[1] },
        reason: "preferred_name",
      };
    }

    // 2. Transient chatter — never persist.
    if (TRANSIENT_RE.test(text)) {
      return {
        shouldConsider: false,
        needsConfirmation: false,
        importance: "low",
        retention: "session",
        reason: "transient",
      };
    }

    // 3. Explicit "احفظ / remember that ..." → confirm before storing.
    if (EXPLICIT_STORE_RE.test(text)) {
      const value = text.replace(EXPLICIT_STORE_RE, "").trim() || text;
      return {
        shouldConsider: true,
        needsConfirmation: true,
        importance: "high",
        retention: "long",
        suggestion: {
          key: value.split(/\s+/).slice(0, 4).join(" "),
          value,
          kind: "fact",
        },
        reason: "explicit_store",
      };
    }

    // 4. Preferences — confirm.
    if (PREFERENCE_RE.test(text)) {
      return {
        shouldConsider: true,
        needsConfirmation: true,
        importance: "medium",
        retention: "long",
        suggestion: {
          key: text.split(/\s+/).slice(0, 4).join(" "),
          value: text,
          kind: "preference",
        },
        reason: "preference",
      };
    }

    // 5. Interests / habits / dates — silent save with medium importance.
    if (INTEREST_RE.test(text)) {
      return {
        shouldConsider: true,
        needsConfirmation: false,
        importance: "medium",
        retention: "long",
        suggestion: { key: "interest", value: text, kind: "fact" },
        reason: "interest",
      };
    }
    if (HABIT_RE.test(text)) {
      return {
        shouldConsider: true,
        needsConfirmation: false,
        importance: "medium",
        retention: "long",
        suggestion: { key: "habit", value: text, kind: "habit" },
        reason: "habit",
      };
    }
    if (DATE_RE.test(text)) {
      return {
        shouldConsider: true,
        needsConfirmation: true,
        importance: "high",
        retention: "permanent",
        suggestion: { key: "date", value: text, kind: "event" },
        reason: "important_date",
      };
    }

    // 6. Default: keep in session only.
    return {
      shouldConsider: false,
      needsConfirmation: false,
      importance: "low",
      retention: "session",
      reason: "no_signal",
    };
  }
}
