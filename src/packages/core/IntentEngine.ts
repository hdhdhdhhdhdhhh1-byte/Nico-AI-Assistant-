import type { Intent, IntentName } from "../shared/types";
import { parseWhen } from "../tasks/TimeParser";

interface Rule {
  intent: IntentName;
  patterns: RegExp[];
  entities?: (text: string) => Record<string, string>;
}

const RULES: Rule[] = [
  {
    intent: "greeting",
    patterns: [/^(مرحبا|مرحبًا|أهلا|اهلا|سلام|السلام عليكم|صباح الخير|مساء الخير|hi|hello|hey)/i],
  },
  {
    intent: "call_contact",
    patterns: [/اتصل|دك على|دق على|مكالمة|اتصل بـ|اتصل ب|call|dial/i],
    entities: (t) => {
      const match = t.match(/(?:اتصل|دك على|دق على|مكالمة|call|dial)\s+(?:بـ|ب|على)?\s*(.+)/i);
      return match ? { target: match[1].trim() } : {};
    },
  },
  {
    intent: "send_message",
    patterns: [/أرسل رسالة|ارسل رسالة|ارسل مسج|دز مسج|أرسل واتساب|ارسل واتساب|send message|sms/i],
    entities: (t) => {
      const match = t.match(
        /(?:أرسل رسالة|ارسل رسالة|ارسل مسج|دز مسج|send message)\s*(?:لـ|إلى|to)?\s*(.*)/i,
      );
      return match ? { target: match[1].trim() } : {};
    },
  },
  {
    intent: "open_app",
    patterns: [/افتح|شغل|افتح تطبيق|فتح|افتح الكاميرا|open app|launch/i],
    entities: (t) => {
      const match = t.match(/(?:افتح|شغل|فتح|open)\s+(?:تطبيق|كاميرا|واتساب|الملاحظات)?\s*(.+)/i);
      return match ? { target: match[1].trim() } : {};
    },
  },
  {
    intent: "time_date",
    patterns: [/الوقت|الساعة|كم الساعة|تاريخ|تاريخ اليوم|اليوم شنو|time|date/i],
  },
  {
    intent: "reminder",
    patterns: [/ذكرني|تذكير|منبه|نبهني|لا تنسى تذكرني|سو لي تذكير|remind/i],
    entities: (t) => {
      const entities: Record<string, string> = {};
      const m = t.match(/(?:بعد|خلال)\s+(\d+)\s*(دقيقة|دقائق|ساعة|ساعات|minute|hour)/i);
      if (m) {
        entities.amount = m[1];
        entities.unit = m[2];
      }
      const when = parseWhen(t);
      if (when) {
        entities.at = String(when.at);
        entities.whenLabel = when.label;
      }
      return entities;
    },
  },
  { intent: "notes", patterns: [/ملاحظة|ملاحظاتي|الملاحظات|انشئ ملاحظة|\bnote(s)?\b/i] },
  { intent: "weather", patterns: [/طقس|جو|حرارة|مطر|الطقس|weather/i] },
  { intent: "calendar", patterns: [/موعد|اجتماع|تقويم|جدول|calendar|meeting/i] },
  { intent: "smart_home", patterns: [/أطفئ|اطفئ|شغل|النور|المكيف|الاضاءة|light|lamp/i] },
  {
    intent: "memory_store",
    patterns: [/تذكر أن|تذكر ان|احفظ|خزن|اسم اسمي|سجل عندك|remember that/i],
  },
  {
    intent: "memory_recall",
    patterns: [/ما هو اسمي|ما اسمي|هل تتذكر|شو تعرف عني|ماذا تعرف|what do you know/i],
  },
  { intent: "search", patterns: [/ابحث|بحث|search|google/i] },
  {
    intent: "question",
    patterns: [/^(ما|من|كيف|لماذا|متى|أين|هل|شو|شنو|ليه|what|how|why|when|where)/i],
  },
];

/**
 * Fast deterministic first pass. The ReasoningEngine may override a
 * low-confidence result with the model's own classification.
 */
export class IntentEngine {
  detect(text: string): Intent {
    const raw = text.trim();
    for (const rule of RULES) {
      if (rule.patterns.some((p) => p.test(raw))) {
        return {
          name: rule.intent,
          confidence: 0.82,
          entities: rule.entities?.(raw) ?? {},
          raw,
        };
      }
    }
    return { name: raw.length > 0 ? "smalltalk" : "unknown", confidence: 0.4, entities: {}, raw };
  }
}
