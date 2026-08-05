import type { Skill } from "../../shared/types";

export const TimeSkill: Skill = {
  id: "time_date",
  name: "الوقت والتاريخ",
  description: "يعرض الوقت والتاريخ الحالي بحسب المنطقة المحلية",
  intents: ["time_date"],
  category: "نظام",
  async execute({ intent }) {
    const raw = intent.raw.toLowerCase();
    const now = new Date();
    const timeStr = now.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
    const dateStr = now.toLocaleDateString("ar-SA", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    if (/تاريخ|اليوم|date/i.test(raw)) {
      return {
        ok: true,
        speech: `اليوم هو ${dateStr}، والوقت الآن ${timeStr}.`,
        data: { timeStr, dateStr },
      };
    }

    return {
      ok: true,
      speech: `الوقت الآن هو ${timeStr}.`,
      data: { timeStr, dateStr },
    };
  },
};
