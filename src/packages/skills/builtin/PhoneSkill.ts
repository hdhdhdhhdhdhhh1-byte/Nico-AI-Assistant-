import type { Skill } from "../../shared/types";
import { mobileBridge } from "../../mobile-bridge";

export const PhoneSkill: Skill = {
  id: "phone",
  name: "المكالمات الهاتفية",
  description: "يجري المكالمات الصوتية ويتعامل مع جهات الاتصال",
  intents: ["call_contact"],
  permissions: ["contacts"],
  category: "هاتف",
  async execute({ intent }) {
    const raw = intent.raw.trim();
    const target =
      intent.entities.target ||
      raw.replace(/(?:اتصل|دك على|دق على|مكالمة|call|dial)\s*(?:بـ|ب|على)?/i, "").trim();

    if (!target) {
      return {
        ok: false,
        speech: "من الشائك تحديد الرقم أو اسم جهة الاتصال. يرجى تحديد الاسم.",
        error: "missing_target",
      };
    }

    const bridge = mobileBridge();
    // Check if numeric
    const isNumber = /^[+\d\s\-()]+$/.test(target);
    if (isNumber) {
      await bridge.phone.call(target);
      return {
        ok: true,
        speech: `جاري الاتصال بالرقم ${target}...`,
        data: { number: target },
      };
    }

    // Try contact pickup if available
    const contact = await bridge.phone.pickContact();
    if (contact && contact.number) {
      await bridge.phone.call(contact.number);
      return {
        ok: true,
        speech: `جاري الاتصال بـ ${contact.name || target}...`,
        data: { name: contact.name, number: contact.number },
      };
    }

    await bridge.phone.call(target);
    return {
      ok: true,
      speech: `جاري فتح واجهة الاتصال لـ ${target}...`,
      data: { target },
    };
  },
};
