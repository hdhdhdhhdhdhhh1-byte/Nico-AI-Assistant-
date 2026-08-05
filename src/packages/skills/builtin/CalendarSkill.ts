import type { Skill } from "../../shared/types";
import { scheduler } from "../../tasks/Scheduler";

export const CalendarSkill: Skill = {
  id: "calendar",
  name: "التقويم",
  description: "يقرأ ويضيف المواعيد في تقويم نيكو المحلي",
  intents: ["calendar"],
  async execute({ intent }) {
    const upcoming = scheduler.upcoming();
    if (/أضف|احجز|سجل|add/i.test(intent.raw)) {
      const task = scheduler.schedule(intent.raw.replace(/^.*?(أضف|احجز|سجل)\s*/i, ""), 60);
      return { ok: true, speech: `سجّلت الموعد "${task.title}".`, data: { id: task.id } };
    }
    if (!upcoming.length) return { ok: true, speech: "ما عندك مواعيد قادمة." };
    return {
      ok: true,
      speech: `عندك ${upcoming.length} موعد قادم، أقربها ${upcoming[0].title}.`,
      data: { count: upcoming.length },
    };
  },
};
