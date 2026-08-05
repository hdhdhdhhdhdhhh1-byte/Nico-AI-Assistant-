export interface ParsedTime {
  /** Minutes from now until the target moment. */
  minutesFromNow: number;
  /** Absolute epoch ms of the target moment. */
  at: number;
  /** Human label, e.g. "غداً 08:00". */
  label: string;
}

const AR_DIGITS = /[\u0660-\u0669]/g;
const normalizeDigits = (s: string) =>
  s.replace(AR_DIGITS, (d) => String(d.charCodeAt(0) - 0x0660));

/**
 * Arabic/English natural time parsing for reminders and calendar events.
 * Supports "بعد 10 دقائق"، "غداً الساعة 8"، "اليوم 20:30"، "at 7am".
 */
export function parseWhen(input: string, now = new Date()): ParsedTime | null {
  const text = normalizeDigits(input).toLowerCase();

  const rel = text.match(
    /(?:بعد|خلال|in)\s+(\d+)\s*(دقيقة|دقائق|دقيقه|ساعة|ساعات|ساعه|يوم|أيام|minute|minutes|hour|hours|day|days)/i,
  );
  if (rel) {
    const n = Number(rel[1]);
    const unit = rel[2];
    const minutes = /ساع|hour/i.test(unit) ? n * 60 : /يوم|day/i.test(unit) ? n * 1440 : n;
    const at = now.getTime() + minutes * 60_000;
    return { minutesFromNow: minutes, at, label: formatLabel(new Date(at), now) };
  }

  const dayOffset = /(غدا|غداً|بكرة|بكره|tomorrow)/i.test(text)
    ? 1
    : /(بعد غد|بعد بكرة|day after tomorrow)/i.test(text)
      ? 2
      : /(اليوم|today)/i.test(text)
        ? 0
        : null;

  const clock = text.match(
    /(?:الساعة|الساعه|at)?\s*(\d{1,2})(?::(\d{2}))?\s*(ص|صباحا|صباحاً|م|مساء|مساءً|am|pm)?/i,
  );
  if (clock && (dayOffset !== null || /الساعة|الساعه|\bat\b/i.test(text))) {
    let hour = Number(clock[1]);
    const minute = Number(clock[2] ?? 0);
    const marker = clock[3] ?? "";
    if (/م|مساء|pm/i.test(marker) && hour < 12) hour += 12;
    if (/ص|صباح|am/i.test(marker) && hour === 12) hour = 0;

    const target = new Date(now);
    target.setSeconds(0, 0);
    target.setDate(target.getDate() + (dayOffset ?? 0));
    target.setHours(hour, minute, 0, 0);
    // No explicit day and the time already passed → assume tomorrow.
    if (dayOffset === null && target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1);
    }
    if (target.getTime() <= now.getTime()) return null;
    const minutesFromNow = Math.round((target.getTime() - now.getTime()) / 60_000);
    return { minutesFromNow, at: target.getTime(), label: formatLabel(target, now) };
  }

  return null;
}

function formatLabel(target: Date, now: Date): string {
  const hh = String(target.getHours()).padStart(2, "0");
  const mm = String(target.getMinutes()).padStart(2, "0");
  const sameDay = target.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = target.toDateString() === tomorrow.toDateString();
  const day = sameDay
    ? "اليوم"
    : isTomorrow
      ? "غداً"
      : target.toLocaleDateString("ar", { day: "numeric", month: "long" });
  return `${day} ${hh}:${mm}`;
}
