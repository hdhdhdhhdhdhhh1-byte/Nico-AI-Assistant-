/**
 * Local AI Engine Architecture for Nico AI Assistant
 * Provides offline-first intelligence: Intent detection, rule-based reasoning,
 * local context synthesis, memory integration, and fallback speech helpers.
 */

export interface LocalThinkOptions {
  transcript: string;
  history?: { role: string; content: string }[];
  memoryDigest?: string;
  userName?: string;
}

export interface LocalThinkResult {
  speech: string;
  intent: string;
  memories: Array<{ key: string; value: string; kind: string }>;
  command?: { action: string; target?: string; payload?: Record<string, any> };
}

export class LocalAIEngine {
  /**
   * Main entry point for local text reasoning & intent detection
   */
  public static processThink(options: LocalThinkOptions): LocalThinkResult {
    const raw = options.transcript.trim();
    const t = raw.toLowerCase();
    const memories: Array<{ key: string; value: string; kind: string }> = [];

    // 1. Check for Memory Store commands
    if (/تذكر أن|تذكر ان|احفظ أن|احفظ ان|اسم اسمي|احفظ لدى/.test(t)) {
      const match = raw.match(/(?:تذكر أن|تذكر ان|احفظ أن|احفظ ان)\s+(.+)/i);
      const fact = match ? match[1].trim() : raw;
      if (fact) {
        memories.push({ key: "user_fact_" + Date.now(), value: fact, kind: "fact" });
      }
      return {
        speech: `حسناً، حفظت هذه المعلومة: "${fact}"`,
        intent: "memory_store",
        memories,
        command: { action: "save_memory", payload: { fact } },
      };
    }

    // Explicit User Name Store
    if (/اسمي\s+([^\s]+)/.test(t)) {
      const match = raw.match(/اسمي\s+([^\s]+)/);
      const name = match ? match[1] : "";
      if (name) {
        memories.push({ key: "user_name", value: name, kind: "profile" });
        return {
          speech: `أهلاً بك يا ${name}! سررت بمعرفتك.`,
          intent: "memory_store",
          memories,
        };
      }
    }

    // 2. Greetings
    if (/^(مرحبا|مرحبًا|السلام عليكم|أهلا|اهلا|صباح الخير|مساء الخير|hello|hi|hey)/.test(t)) {
      const greeting = options.userName
        ? `أهلاً بك يا ${options.userName}! كيف يمكنني مساعدتك اليوم؟`
        : "أهلاً بك! أنا نيكو، مساعدك الشخصي. كيف أستطيع مساعدتك اليوم؟";
      return {
        speech: greeting,
        intent: "greeting",
        memories: [],
      };
    }

    // 3. Identity / Bot Info
    if (/من أنت|من انت|ما اسمك|تعرف عن نفسك|who are you/.test(t)) {
      return {
        speech:
          "أنا نيكو، مساعدك الذكي الشخصي. أعمل محلياً على جهازك لمساعدتك في المهام اليومية والصوتية بسرعة وبدون الحاجة لإنترنت.",
        intent: "smalltalk",
        memories: [],
      };
    }

    // 4. Time and Date
    if (/الوقت|الساعة|تاريخ|اليوم|time|date/.test(t)) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
      const dateStr = now.toLocaleDateString("ar-SA", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      let speech = `الوقت الآن هو ${timeStr}.`;
      if (/تاريخ|اليوم|date/.test(t)) {
        speech = `اليوم هو ${dateStr}، والوقت الآن ${timeStr}.`;
      }

      return {
        speech,
        intent: "time_date",
        memories: [],
      };
    }

    // 5. Calls / Phone Commands
    if (/اتصل بـ|اتصل ب|اتصل على|مكالمة|call\s+/i.test(t)) {
      const nameMatch = raw.match(/(?:اتصل بـ|اتصل ب|اتصل على|call)\s+(.+)/i);
      const target = nameMatch ? nameMatch[1].trim() : "جهة الاتصال";
      return {
        speech: `جاري الاتصال بـ ${target}...`,
        intent: "call_contact",
        memories: [],
        command: { action: "make_call", target },
      };
    }

    // 6. Messages
    if (/أرسل رسالة|ارسل رسالة|ارسل مسج|send message/i.test(t)) {
      const msgMatch = raw.match(/(?:أرسل رسالة|ارسل رسالة|send message)\s*(?:لـ|إلى|to)?\s*(.*)/i);
      const target = msgMatch ? msgMatch[1].trim() : "";
      return {
        speech: target ? `جاري تجهيز الرسالة إلى ${target}...` : "جاري فتح تطبيق الرسائل...",
        intent: "send_message",
        memories: [],
        command: { action: "send_sms", target },
      };
    }

    // 7. Reminders
    if (/ذكرني|تذكير|انبهني|remind me/i.test(t)) {
      const remMatch = raw.match(/(?:ذكرني|تذكير|remind me)\s+(?:بـ|بأن|to)?\s*(.+)/i);
      const reminderText = remMatch ? remMatch[1].trim() : raw;
      return {
        speech: `تم ضبط التذكير: "${reminderText}"`,
        intent: "set_reminder",
        memories: [],
        command: { action: "set_reminder", payload: { text: reminderText } },
      };
    }

    // 8. App Launching
    if (/افتح|شغل|افتح تطبيق|open app/i.test(t)) {
      const appMatch = raw.match(/(?:افتح|شغل|open)\s+(?:تطبيق)?\s*(.+)/i);
      const appName = appMatch ? appMatch[1].trim() : "التطبيق";
      return {
        speech: `جاري فتح ${appName}...`,
        intent: "open_app",
        memories: [],
        command: { action: "open_app", target: appName },
      };
    }

    // 9. Notes & Tasks
    if (/ملاحظة|ملاحظاتي|أنشئ ملاحظة|انشئ ملاحظة|افتح الملاحظات|note/i.test(t)) {
      return {
        speech: "تم فتح سجل الملاحظات الخاص بك.",
        intent: "read_notes",
        memories: [],
        command: { action: "open_notes" },
      };
    }

    // 10. Memory Recall
    if (/ماذا تعرف|ما اسمي|ماذا تذكرت|ذاكرة|search memory/i.test(t)) {
      if (options.memoryDigest) {
        return {
          speech: `إليك ما أتذكره: ${options.memoryDigest}`,
          intent: "memory_recall",
          memories: [],
        };
      }
      return {
        speech: "لا توجد لدي ملاحظات محفوظة كافية بعد، يمكنك إخباري بأي شيء لكي أتذكره لك.",
        intent: "memory_recall",
        memories: [],
      };
    }

    // 11. Weather
    if (/الطقس|الجو|حرارة|weather/i.test(t)) {
      return {
        speech: "الطقس معتدل ولطيف اليوم. يمكنك تفعيل تحديد الموقع للحقوق المحدثة.",
        intent: "weather",
        memories: [],
      };
    }

    // Default Fallback
    return {
      speech: `فهمت طلبك بخصوص "${raw}". أنا أعمل محلياً ويمكنني مساعدتك في الأوامر والتذكيرات والذاكرة.`,
      intent: "smalltalk",
      memories: [],
    };
  }
}
