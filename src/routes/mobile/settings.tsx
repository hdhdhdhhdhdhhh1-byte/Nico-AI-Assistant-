import { createFileRoute, Link } from "@tanstack/react-router";
import { useNicoMobile } from "@/hooks/useNicoMobile";
import { VOICE_OPTIONS, type VoiceStyle } from "@/packages/voice/VoiceProfile";
import { MOBILE_PERMISSIONS } from "@/packages/mobile";
import type { CommunicationStyle } from "@/packages/shared/types";

export const Route = createFileRoute("/mobile/settings")({
  head: () => ({
    meta: [
      { title: "إعدادات نيكو — الصوت والشخصية وطريقة الرد" },
      {
        name: "description",
        content:
          "اضبط صوت نيكو وسرعته ونبرته، اختر شخصيته، وحدد طول ردوده، وأدر أذونات هاتفك في مكان واحد.",
      },
      { property: "og:title", content: "إعدادات نيكو — الصوت والشخصية وطريقة الرد" },
      {
        property: "og:description",
        content: "تحكم كامل في صوت نيكو وشخصيته وأذوناته من داخل التطبيق.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NicoSettings,
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
};

function NicoSettings() {
  const nico = useNicoMobile();
  const voice = nico.voiceProfile;

  return (
    <main dir="rtl" className="mx-auto w-full max-w-md space-y-8 px-5 py-8">
      <header className="flex items-center justify-between">
        <Link to="/mobile" className="text-sm text-muted-foreground">
          رجوع
        </Link>
        <h1 className="text-base font-semibold">إعدادات نيكو</h1>
        <span className="w-10" />
      </header>

      <section className="space-y-4">
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

        <button
          type="button"
          onClick={() => void nico.runtime.voice.say("هكذا سيكون صوتي.")}
          className="w-full rounded-2xl border border-border bg-secondary px-4 py-3 text-sm"
        >
          استمع لعينة
        </button>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">الشخصية</h2>
        <div className="grid grid-cols-2 gap-2">
          {STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => nico.updateVoiceProfile({ style: s.id })}
              className={`rounded-2xl border px-4 py-3 text-sm transition-colors ${
                voice.style === s.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">طريقة الرد</h2>
        <div className="flex gap-2">
          {LENGTHS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => nico.updateProfile({ communicationStyle: l.id })}
              className={`flex-1 rounded-2xl border px-3 py-3 text-sm transition-colors ${
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

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">أذونات الهاتف</h2>
        <p className="text-xs text-muted-foreground">
          تُطلب عند الحاجة فقط، ويمكنك سحبها في أي وقت.
        </p>
        <ul className="space-y-2">
          {MOBILE_PERMISSIONS.map((key) => {
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

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">الحساب</h2>
        {nico.isAuthenticated ? (
          <button
            type="button"
            onClick={() => void nico.signOut()}
            className="w-full rounded-2xl border border-border px-4 py-3 text-sm text-muted-foreground"
          >
            تسجيل الخروج ({nico.authEmail})
          </button>
        ) : (
          <Link
            to="/auth"
            className="block w-full rounded-2xl bg-primary px-4 py-3 text-center text-sm font-medium text-primary-foreground"
          >
            تسجيل الدخول وربط الذاكرة
          </Link>
        )}
      </section>
    </main>
  );
}
