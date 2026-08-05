import type { Intent, IntentName } from "../../shared/types";
import type { RequestCategory, RichIntent } from "../../shared/agent";
import { IntentEngine } from "../IntentEngine";

/** Maps a fine-grained intent to its high-level request category. */
export const CATEGORY_BY_INTENT: Record<IntentName, RequestCategory> = {
  greeting: "conversation",
  smalltalk: "conversation",
  question: "question",
  reminder: "reminder",
  weather: "question",
  calendar: "task_execution",
  search: "search",
  smart_home: "command",
  notes: "task_execution",
  memory_store: "personal_info",
  memory_recall: "personal_info",
  unknown: "conversation",
};

const COMMAND_RE =
  /^(شغل|أطفئ|اطفئ|افتح|اقفل|أرسل|ارسل|احجز|سوي|نفذ|turn|open|close|send|play|stop)/i;
const PERSONAL_RE = /(اسمي|أنا أحب|انا احب|تفضيلي|عادتي|my name is|i like|i prefer)/i;
const SPLIT_RE =
  /\s*(?:،|,|\bثم\b|\bوبعدين\b|\bبعدها\b|\band then\b|\bثمّ\b)\s*|\s+و(?=(?:أرسل|ارسل|ذكرني|شغل|أطفئ|اطفئ|ابحث|احجز|أضف|اضف))/i;

/**
 * Advanced Intent Engine.
 * Adds request-category classification, multi-ask segmentation and
 * reference detection on top of the deterministic rule engine.
 */
export class AdvancedIntentEngine {
  constructor(private readonly base = new IntentEngine()) {}

  classify(text: string, opts: { isReference?: boolean } = {}): RichIntent {
    const raw = text.trim();
    const intent: Intent = this.base.detect(raw);
    const segments = this.segment(raw);

    return {
      ...intent,
      confidence: segments.length > 1 ? Math.min(intent.confidence, 0.75) : intent.confidence,
      category: this.categorize(raw, intent.name),
      segments,
      isReference: opts.isReference ?? false,
    };
  }

  /** Classifies a single sub-request (used by the planner per segment). */
  classifySegment(segment: string): RichIntent {
    const intent = this.base.detect(segment.trim());
    return {
      ...intent,
      category: this.categorize(segment, intent.name),
      segments: [segment.trim()],
      isReference: false,
    };
  }

  private categorize(raw: string, intent: IntentName): RequestCategory {
    if (PERSONAL_RE.test(raw)) return "personal_info";
    if (intent === "smalltalk" || intent === "unknown") {
      if (COMMAND_RE.test(raw)) return "command";
      if (/[?؟]$/.test(raw)) return "question";
    }
    if (COMMAND_RE.test(raw) && CATEGORY_BY_INTENT[intent] === "conversation") return "command";
    return CATEGORY_BY_INTENT[intent];
  }

  /** Splits "ذكرني بكرة وأرسل رسالة" into independent asks. */
  segment(raw: string): string[] {
    const parts = raw
      .split(new RegExp(SPLIT_RE, "gi"))
      .map((p) => (p ?? "").trim())
      .filter((p) => p.length > 2);
    return parts.length > 1 ? parts : [raw];
  }
}
