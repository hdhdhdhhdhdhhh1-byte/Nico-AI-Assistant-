import type { Skill } from "../../shared/types";

export const MemorySkill: Skill = {
  id: "memory",
  name: "الذاكرة",
  description: "يحفظ ويسترجع المعلومات الشخصية بناءً على طلب المستخدم",
  intents: ["memory_store", "memory_recall"],
  async execute({ intent, recall, remember }) {
    if (intent.name === "memory_store") {
      const value = intent.raw.replace(/تذكر أن|احفظ|خزن|remember that/gi, "").trim();
      if (!value) return { ok: false, speech: "", error: "empty" };
      remember({ key: value.split(/\s+/).slice(0, 4).join(" "), value, kind: "fact" });
      return { ok: true, speech: "حفظتها في ذاكرتي." };
    }
    const hits = recall(intent.raw);
    if (!hits.length) return { ok: false, speech: "", error: "no_memory" };
    return { ok: true, speech: hits.map((h) => h.value).join("، ") + "." };
  },
};
