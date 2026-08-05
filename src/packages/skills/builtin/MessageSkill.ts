import type { Skill } from "../../shared/types";
import { mobileBridge } from "../../mobile-bridge";

export const MessageSkill: Skill = {
  id: "message",
  name: "الرسائل النصية",
  description: "يرسل الرسائل النصية المباشرة والمحفوظات",
  intents: ["send_message"],
  permissions: ["contacts"],
  category: "هاتف",
  async execute({ intent }) {
    const raw = intent.raw.trim();
    const target =
      intent.entities.target ||
      raw
        .replace(/(?:أرسل رسالة|ارسل رسالة|ارسل مسج|دز مسج|send message)\s*(?:لـ|إلى|to)?/i, "")
        .trim();

    const bridge = mobileBridge();
    await bridge.phone.sendSms(target || "", "");

    return {
      ok: true,
      speech: target ? `جاري فتح تطبيق الرسائل للربط مع ${target}...` : "جاري فتح تطبيق الرسائل...",
      data: { target },
    };
  },
};
