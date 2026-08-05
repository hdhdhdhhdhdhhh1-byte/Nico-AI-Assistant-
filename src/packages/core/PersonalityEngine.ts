import type { PersonalityProfile, UserProfileData } from "../shared/types";
import type { EmotionReading } from "./emotion/EmotionAnalyzer";

/**
 * Personality Engine.
 * Holds Nico's stable persona and adapts delivery (tone, verbosity) based
 * on the user's learned communication style and current emotional state.
 * The core personality never changes — only its expression does.
 */
export class PersonalityEngine {
  static readonly BASE: PersonalityProfile = {
    traits: ["friendly", "helpful", "respectful", "shortAnswers"],
    tone: "friendly",
    verbosity: "concise",
    respectful: true,
  };

  buildSystemPrompt(profile: UserProfileData, emotion?: EmotionReading): string {
    const personality = { ...PersonalityEngine.BASE, ...profile.personality };
    const name = profile.preferredName || profile.name;
    const lines: string[] = [
      `أنت "نيكو"، مساعد شخصي دائم يعرف مستخدمه ويتذكره.`,
      `شخصيتك ثابتة: ${personality.traits.join("، ")}.`,
      personality.tone === "formal"
        ? "تحدث بأسلوب مهذب ورسمي."
        : personality.tone === "playful"
          ? "تحدث بأسلوب مرِح خفيف الظل مع الحفاظ على الاحترام."
          : "تحدث بلهجة ودودة وطبيعية.",
      personality.verbosity === "concise"
        ? "ردودك قصيرة جداً (جملة إلى جملتين) لأنها تُنطق صوتياً."
        : personality.verbosity === "detailed"
          ? "أعطِ إجابات وافية عند الحاجة لكن دون حشو."
          : "وازن بين الاختصار والوضوح.",
      "بلا رموز أو نقاط تعداد أو markdown. أنت تتحدث لا تكتب رسائل.",
      "تستخدم المعلومات التي تعرفها عن المستخدم بشكل طبيعي دون تكرار ممل.",
      "لا تخترع معلومات؛ إذا لم تعرف قل ذلك باختصار.",
    ];
    if (name) lines.push(`نادِ المستخدم باسم "${name}" عند المناسبة.`);
    if (profile.interests.length) {
      lines.push(`اهتمامات المستخدم: ${profile.interests.slice(0, 5).join("، ")}.`);
    }
    if (emotion && emotion.emotion !== "neutral") {
      const tone = {
        warm: "استخدم نبرة دافئة ومتفهمة",
        empathetic: "استخدم نبرة متعاطفة وهادئة",
        calm: "استخدم نبرة هادئة ومريحة",
        cheerful: "شاركه فرحته بنبرة مبهجة",
        neutral: "",
      }[emotion.suggestedTone];
      if (tone) lines.push(`المستخدم يبدو ${emotion.emotion}؛ ${tone}.`);
    }
    lines.push(
      `أعد دائماً JSON فقط بالشكل: {"speech":"...","intent":"greeting|smalltalk|question|reminder|weather|calendar|search|smart_home|memory_store|memory_recall|unknown","memories":[{"key":"...","value":"...","kind":"profile|preference|habit|fact|event"}]}`,
      "ضع في memories فقط المعلومات الشخصية الجديدة الجديرة بالحفظ الدائم؛ خلاف ذلك اتركها فارغة.",
    );
    return lines.join("\n");
  }
}

export const personalityEngine = new PersonalityEngine();
