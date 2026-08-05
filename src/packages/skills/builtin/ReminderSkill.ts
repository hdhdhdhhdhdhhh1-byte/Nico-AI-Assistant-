import type { Skill } from "../../shared/types";
import { reminderEngine } from "../../tasks/ReminderEngine";
import { parseWhen } from "../../tasks/TimeParser";

/** Creates reminders from relative ("بعد 10 دقائق") or absolute ("غداً الساعة 8") time. */
export const ReminderSkill: Skill = {
  id: "reminder",
  name: "التذكيرات",
  description: "ينشئ تذكيرات بوقت محدد وينبّه المستخدم",
  intents: ["reminder"],
  permissions: ["notifications"],
  category: "إنتاجية",
  async execute({ intent }) {
    const parsed = parseWhen(intent.raw);
    const fallbackAmount = Number(intent.entities.amount ?? 10);
    const unit = intent.entities.unit ?? "دقيقة";
    const minutes = parsed
      ? parsed.minutesFromNow
      : /ساع|hour/i.test(unit)
        ? fallbackAmount * 60
        : fallbackAmount;

    const title = intent.raw
      .replace(/ذكرني|تذكير|remind me/gi, "")
      .replace(/(?:بعد|خلال|in)\s+\d+\s*\S+/i, "")
      .replace(/(?:غدا|غداً|بكرة|بكره|اليوم|tomorrow|today)/gi, "")
      .replace(/(?:الساعة|الساعه|at)\s*\d{1,2}(?::\d{2})?\s*(?:ص|م|صباحا|مساء|am|pm)?/gi, "")
      .replace(/^\s*(ب|أن|ان|to)\s*/i, "")
      .trim();

    const task = reminderEngine.create(title || "تذكير", minutes);
    const when = parsed ? parsed.label : `بعد ${minutes} دقيقة`;
    return {
      ok: true,
      speech: `تمام، بذكرك بـ"${task.title}" ${when}.`,
      data: { id: task.id, dueAt: task.dueAt, when },
    };
  },
};
