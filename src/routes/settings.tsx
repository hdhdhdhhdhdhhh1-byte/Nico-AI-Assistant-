import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useNico } from "@/hooks/useNico";
import { VOICE_OPTIONS, type VoiceStyle } from "@/packages/voice/VoiceProfile";
import { taskAutomation, type AutomationSchedule } from "@/packages/tasks/TaskAutomation";
import { usageAnalytics, type UsageSnapshot } from "@/packages/analytics/UsageAnalytics";
import type { SkillInfo } from "@/packages/skills/SkillManager";
import type { CommunicationStyle, PermissionKey } from "@/packages/shared/types";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "إعدادات نيكو — الصوت والشخصية والمهارات والخصوصية" },
      {
        name: "description",
        content:
          "لوحة إعدادات نيكو الكاملة: ملفك الشخصي، صوت المساعد وسرعته، شخصيته، تفعيل المهارات، إدارة الذاكرة والأذونات، والتنبيهات.",
      },
      { property: "og:title", content: "إعدادات نيكو — تحكم كامل بمساعدك الشخصي" },
      {
        property: "og:description",
        content: "اضبط الصوت والشخصية والمهارات والخصوصية والتنبيهات في مكان واحد.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

const STYLES: { id: VoiceStyle; label: string }[] = [
  { id: "friendly", label: "ودود" },
  { id: "formal", label: "احترافي" },
  { id: "calm", label: "هادئ" },
  { id: "energetic", label: "مرِح" },
];

const LENGTHS: { id: CommunicationStyle; label: string }[] = [
  { id: "concise", label: "قصير" },
  { id: "balanced", label: "متوازن" },
  { id: "detailed", label: "مفصّل" },
];

const PERMISSION_LABEL: Record<string, string> = {
  microphone: "الميكروفون",
  notifications: "الإشعارات",
  location: "الموقع",
  bluetooth: "البلوتوث",
  background_audio: "الاستماع في الخلفية",
  camera: "الكاميرا",
  files: "الملفات",
  contacts: "جهات الاتصال",
};

const SECTION = "space-y-4 rounded-3xl border border-border bg-card/40 p-5";

function SettingsPage() {
  const nico = useNico();
  const voice = nico.voiceProfile;
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [schedules, setSchedules] = useState<AutomationSchedule[]>([]);
  const [stats, setStats] = useState<UsageSnapshot | null>(null);
  const [cloudAnalytics, setCloudAnalytics] = useState(false);
  const [compressed, setCompressed] = useState<number | null>(null);

  useEffect(() => {
    const sync = () => setSkills(nico.runtime.skills.describe());
    sync();
    const off = nico.runtime.skills.registry.subscribe(sync);
    return () => {
      off();
    };
  }, [nico.runtime]);

  useEffect(() => {
    const off = taskAutomation.subscribe(setSchedules);
    return () => {
      off();
    };
  }, []);
  useEffect(() => {
    const off = usageAnalytics.subscribe(setStats);
    return () => {
      off();
    };
  }, []);
  useEffect(() => {
    usageAnalytics.configureCloud(
      (e) => nico.logEvent(e.event_type, e.detail),
      cloudAnalytics && nico.isAuthenticated,
    );
  }, [cloudAnalytics, nico.isAuthenticated, nico.logEvent]);

  const permissionKeys = Object.keys(nico.permissions) as PermissionKey[];

  return (
    <main dir="rtl" className="mx-auto w-full max-w-2xl space-y-6 px-5 py-10">
      <header className="flex items-center justify-between">
        <Link to="/nico" className="text-sm text-muted-foreground">
          رجوع
        </Link>
        <h1 className="text-lg font-semibold">إعدادات نيكو</h1>
        <Link to="/mobile" className="text-sm text-muted-foreground">
          التطبيق
        </Link>
      </header>

      {/* Profile */}
      <section className={SECTION}>
        <h2 className="text-sm font-semibold">الملف الشخصي</h2>
        <label className="block space-y-2">
          <span className="text-xs text-muted-foreground">الاسم</span>
          <input
            defaultValue={nico.profile.preferredName ?? nico.profile.name ?? ""}
            onBlur={(e) =>
              nico.updateProfile({ preferredName: e.target.value.trim() || undefined })
            }
            placeholder="كيف تحب أن يناديك نيكو؟"
            className="w-full rounded-2xl border border-border bg-secondary px-4 py-3 text-sm"
          />
        </label>
        <div className="flex gap-2">
          {(["ar", "en"] as const).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => {
                nico.updateProfile({ locale: lang });
                nico.updateVoiceProfile({ language: lang });
              }}
              className={`flex-1 rounded-2xl border px-3 py-3 text-sm ${
                nico.profile.locale === lang
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground"
              }`}
            >
              {lang === "ar" ? "العربية" : "English"}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {nico.isAuthenticated
            ? `مرتبط بالحساب ${nico.authEmail} — ذاكرتك تتزامن مع السحابة.`
            : "أنت تستخدم نيكو كضيف — البيانات محفوظة على هذا الجهاز فقط."}
        </p>
      </section>

      {/* Voice */}
      <section className={SECTION}>
        <h2 className="text-sm font-semibold">الصوت</h2>
        <label className="block space-y-2">
          <span className="text-xs text-muted-foreground">صوت نيكو</span>
          <select
            value={voice.voiceId}
            onChange={(e) => nico.updateVoiceProfile({ voiceId: e.target.value })}
            className="w-full rounded-2xl border border-border bg-secondary px-4 py-3 text-sm"
          >
            {VOICE_OPTIONS.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-xs text-muted-foreground">السرعة — {voice.speed.toFixed(2)}×</span>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.05}
            value={voice.speed}
            onChange={(e) => nico.updateVoiceProfile({ speed: Number(e.target.value) })}
            className="w-full accent-primary"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-xs text-muted-foreground">النبرة — {voice.pitch.toFixed(2)}×</span>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.05}
            value={voice.pitch}
            onChange={(e) => nico.updateVoiceProfile({ pitch: Number(e.target.value) })}
            className="w-full accent-primary"
          />
        </label>
        <div className="flex gap-2">
          {(["ar", "en"] as const).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => nico.updateVoiceProfile({ language: lang })}
              className={`flex-1 rounded-2xl border px-3 py-2 text-xs ${
                voice.language === lang
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground"
              }`}
            >
              {lang === "ar" ? "لغة الصوت: العربية" : "Voice language: English"}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            void nico.runtime.voice.say(
              voice.language === "ar" ? "هكذا سيكون صوتي." : "This is how I will sound.",
            )
          }
          className="w-full rounded-2xl border border-border bg-secondary px-4 py-3 text-sm"
        >
          استمع لعينة
        </button>
      </section>

      {/* Personality */}
      <section className={SECTION}>
        <h2 className="text-sm font-semibold">الشخصية</h2>
        <div className="grid grid-cols-2 gap-2">
          {STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => nico.updateVoiceProfile({ style: s.id })}
              className={`rounded-2xl border px-4 py-3 text-sm ${
                voice.style === s.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {LENGTHS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => nico.updateProfile({ communicationStyle: l.id })}
              className={`flex-1 rounded-2xl border px-3 py-3 text-sm ${
                nico.profile.communicationStyle === l.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </section>

      {/* Skills */}
      <section className={SECTION}>
        <h2 className="text-sm font-semibold">المهارات</h2>
        <p className="text-xs text-muted-foreground">
          فعّل أو أوقف أي مهارة. المهارة المتوقفة لا تُستدعى ولا تطلب صلاحيات.
        </p>
        <ul className="space-y-2">
          {skills.map((s) => (
            <li key={s.id} className="rounded-2xl border border-border px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm">{s.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{s.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => nico.runtime.skills.setEnabled(s.id, !s.enabled)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs ${
                    s.enabled
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-muted-foreground"
                  }`}
                >
                  {s.enabled ? "مفعّلة" : "متوقفة"}
                </button>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                استُخدمت {s.usage.runs} مرة
                {s.usage.failures ? ` — ${s.usage.failures} إخفاق` : ""}
                {s.permissions.length ? ` — تحتاج: ${s.permissions.join("، ")}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* Automation */}
      <section className={SECTION}>
        <h2 className="text-sm font-semibold">المهام التلقائية</h2>
        <ul className="space-y-2">
          {schedules.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between rounded-2xl border border-border px-4 py-3"
            >
              <div>
                <p className="text-sm">{s.label}</p>
                <input
                  type="time"
                  value={s.time}
                  onChange={(e) => taskAutomation.update(s.id, { time: e.target.value })}
                  className="mt-1 rounded-xl border border-border bg-secondary px-2 py-1 text-xs"
                />
              </div>
              <button
                type="button"
                onClick={() => taskAutomation.update(s.id, { enabled: !s.enabled })}
                className={`rounded-full px-3 py-1 text-xs ${
                  s.enabled
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground"
                }`}
              >
                {s.enabled ? "مفعّل" : "متوقف"}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Privacy */}
      <section className={SECTION}>
        <h2 className="text-sm font-semibold">الخصوصية والذاكرة</h2>
        <p className="text-xs text-muted-foreground">
          نيكو يتذكر {nico.memories.length} معلومة عنك. يمكنك ضغطها أو حذفها بالكامل.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCompressed(nico.runtime.memory.compress())}
            className="rounded-2xl border border-border px-4 py-2 text-xs"
          >
            ضغط الذاكرة
          </button>
          <button
            type="button"
            onClick={() => void nico.forgetAll()}
            className="rounded-2xl border border-destructive px-4 py-2 text-xs text-destructive"
          >
            حذف كل الذاكرة
          </button>
          {nico.isAuthenticated && (
            <Link
              to="/privacy"
              className="rounded-2xl border border-primary/50 bg-primary/10 px-4 py-2 text-xs text-primary"
            >
              مركز الخصوصية →
            </Link>
          )}
        </div>
        {compressed !== null && (
          <p className="text-[11px] text-muted-foreground">
            {compressed ? `أزلت ${compressed} سجلاً مكرراً أو منتهياً.` : "الذاكرة مضغوطة أصلاً."}
          </p>
        )}
        <ul className="space-y-2">
          {permissionKeys.map((key) => {
            const status = nico.permissions[key];
            return (
              <li
                key={key}
                className="flex items-center justify-between rounded-2xl border border-border px-4 py-3"
              >
                <div>
                  <p className="text-sm">{PERMISSION_LABEL[key] ?? key}</p>
                  <p className="text-[11px] text-muted-foreground">{nico.permissionReason(key)}</p>
                </div>
                {status === "granted" ? (
                  <button
                    type="button"
                    onClick={() => nico.revokePermission(key)}
                    className="text-xs text-destructive"
                  >
                    سحب
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void nico.requestPermission(key)}
                    className="text-xs text-primary"
                  >
                    السماح
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Notifications */}
      <section className={SECTION}>
        <h2 className="text-sm font-semibold">التنبيهات</h2>
        <div className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
          <p className="text-sm">تنبيهات التذكيرات والمواعيد</p>
          <button
            type="button"
            onClick={() =>
              nico.permissions.notifications === "granted"
                ? nico.revokePermission("notifications")
                : void nico.requestPermission("notifications")
            }
            className={`rounded-full px-3 py-1 text-xs ${
              nico.permissions.notifications === "granted"
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground"
            }`}
          >
            {nico.permissions.notifications === "granted" ? "مفعّلة" : "متوقفة"}
          </button>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
          <p className="text-sm">تحية تلقائية عند الفتح</p>
          <button
            type="button"
            onClick={() => nico.setAutoGreeting(!nico.assistant.autoGreeting)}
            className={`rounded-full px-3 py-1 text-xs ${
              nico.assistant.autoGreeting
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground"
            }`}
          >
            {nico.assistant.autoGreeting ? "مفعّلة" : "متوقفة"}
          </button>
        </div>
      </section>

      {/* Analytics */}
      <section className={SECTION}>
        <h2 className="text-sm font-semibold">الإحصائيات</h2>
        <p className="text-xs text-muted-foreground">
          أرقام فقط — لا نحفظ نص محادثاتك ضمن الإحصائيات.
        </p>
        {stats && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Stat label="المحادثات" value={stats.conversations} />
            <Stat label="الرسائل" value={stats.messages} />
            <Stat label="دقائق الصوت" value={stats.voiceMinutes} />
            <Stat label="الأخطاء التقنية" value={stats.errors} />
          </div>
        )}
        <div className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
          <p className="text-sm">مشاركة إحصائيات مجهولة مع حسابي</p>
          <button
            type="button"
            onClick={() => setCloudAnalytics((v) => !v)}
            className={`rounded-full px-3 py-1 text-xs ${
              cloudAnalytics
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground"
            }`}
          >
            {cloudAnalytics ? "مفعّلة" : "متوقفة"}
          </button>
        </div>
        <button
          type="button"
          onClick={() => usageAnalytics.reset()}
          className="w-full rounded-2xl border border-border px-4 py-2 text-xs text-muted-foreground"
        >
          تصفير الإحصائيات
        </button>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border px-4 py-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-base font-semibold">{value}</p>
    </div>
  );
}
