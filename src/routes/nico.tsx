import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { NicoOrb } from "@/components/nico/NicoOrb";
import { VoiceWaves } from "@/components/nico/VoiceWaves";
import { useNico } from "@/hooks/useNico";
import { WelcomeExperience, hasSeenWelcome } from "@/components/nico/WelcomeExperience";
import { VOICE_OPTIONS, type VoiceStyle } from "@/packages/voice/VoiceProfile";

export const Route = createFileRoute("/nico")({
  head: () => ({
    meta: [
      { title: "تحدث مع نيكو — تجربة صوتية كاملة" },
      {
        name: "description",
        content:
          "شاشة نيكو الصوتية: اضغط وتحدث، اختر صوت المساعد وسرعته ونبرته، وشاهد آخر رد بدون فوضى المحادثات.",
      },
      { property: "og:title", content: "تحدث مع نيكو — تجربة صوتية كاملة" },
      {
        property: "og:description",
        content: "واجهة صوت أولاً: أوامر سريعة، ردود فورية، وإعدادات صوت شخصية.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VoiceFirst,
});

const STYLES: { id: VoiceStyle; label: string }[] = [
  { id: "friendly", label: "ودود" },
  { id: "calm", label: "هادئ" },
  { id: "energetic", label: "حيوي" },
  { id: "formal", label: "رسمي" },
];

function VoiceFirst() {
  const nico = useNico();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (!hasSeenWelcome()) setShowWelcome(true);
  }, []);
  const listening = nico.state === "listening";

  const lastUser = useMemo(
    () => [...nico.turns].reverse().find((t) => t.role === "user"),
    [nico.turns],
  );
  const lastNico = useMemo(
    () => [...nico.turns].reverse().find((t) => t.role === "nico"),
    [nico.turns],
  );

  return (
    <main
      dir="rtl"
      className="relative mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-between px-5 py-8"
    >
      {showWelcome && (
        <WelcomeExperience
          isAuthenticated={nico.isAuthenticated}
          language={nico.voiceProfile.language}
          onLanguage={(language) => nico.updateVoiceProfile({ language })}
          onRequestMic={() => nico.requestPermission("microphone")}
          onSpeak={(text) => nico.runtime.voice.say(text)}
          onDone={() => setShowWelcome(false)}
        />
      )}

      <header className="flex w-full items-center justify-between">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          رجوع
        </Link>
        <h1 className="text-sm font-medium tracking-wide text-muted-foreground">وضع الصوت</h1>
        <button
          type="button"
          onClick={() => setSettingsOpen((v) => !v)}
          aria-expanded={settingsOpen}
          className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          إعدادات الصوت
        </button>
      </header>

      <section className="flex w-full flex-1 flex-col items-center justify-center gap-8">
        <NicoOrb
          state={nico.presence}
          level={nico.level}
          onPress={() => void (listening ? nico.stopListening() : nico.startListening())}
        />
        <VoiceWaves state={nico.state} level={nico.level} />

        <button
          type="button"
          onClick={() => void nico.setAlwaysReady(!nico.assistant.alwaysReady)}
          className={`rounded-full border px-5 py-2.5 text-sm transition-colors ${
            nico.assistant.alwaysReady
              ? "border-primary/50 bg-primary/15 text-primary"
              : "border-border bg-secondary text-secondary-foreground hover:text-foreground"
          }`}
        >
          {nico.assistant.alwaysReady
            ? nico.wakeWordArmed
              ? "جاهز دائماً — قل «يا نيكو»"
              : "جاهز دائماً — مفعّل"
            : "تفعيل وضع الجاهزية الدائمة"}
        </button>

        <button
          type="button"
          onClick={() =>
            nico.continuous ? nico.stopConversation() : void nico.startConversation()
          }
          className={`rounded-full border px-5 py-2.5 text-sm transition-colors ${
            nico.continuous
              ? "border-accent/50 bg-accent/15 text-accent"
              : "border-border bg-secondary text-secondary-foreground hover:text-foreground"
          }`}
        >
          {nico.continuous ? "إيقاف المحادثة المستمرة" : "محادثة مستمرة بدون يدين"}
        </button>

        <div className="min-h-24 w-full space-y-3 text-center">
          {lastUser && <p className="text-sm text-muted-foreground">«{lastUser.content}»</p>}
          {lastNico && (
            <p className="text-balance text-lg leading-relaxed text-foreground">
              {lastNico.content}
            </p>
          )}
          {!lastUser && !lastNico && (
            <p className="text-sm text-muted-foreground">
              اضغط الدائرة وقل «يا نيكو، ذكّرني بالاجتماع الساعة ٤».
            </p>
          )}
          {nico.error && <p className="text-sm text-destructive">{nico.error}</p>}
        </div>
      </section>

      {settingsOpen && (
        <section className="w-full space-y-5 rounded-3xl border border-border bg-card p-5 text-card-foreground">
          <div className="space-y-2">
            <label htmlFor="voice-name" className="text-xs text-muted-foreground">
              الصوت
            </label>
            <select
              id="voice-name"
              value={nico.voiceProfile.voiceId}
              onChange={(e) => nico.updateVoiceProfile({ voiceId: e.target.value })}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            >
              {VOICE_OPTIONS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="voice-speed" className="text-xs text-muted-foreground">
              السرعة — {nico.voiceProfile.speed.toFixed(2)}×
            </label>
            <input
              id="voice-speed"
              type="range"
              min={0.5}
              max={2}
              step={0.05}
              value={nico.voiceProfile.speed}
              onChange={(e) => nico.updateVoiceProfile({ speed: Number(e.target.value) })}
              className="w-full accent-primary"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="voice-pitch" className="text-xs text-muted-foreground">
              طبقة الصوت — {nico.voiceProfile.pitch.toFixed(2)}×
            </label>
            <input
              id="voice-pitch"
              type="range"
              min={0.5}
              max={2}
              step={0.05}
              value={nico.voiceProfile.pitch}
              onChange={(e) => nico.updateVoiceProfile({ pitch: Number(e.target.value) })}
              className="w-full accent-primary"
            />
          </div>

          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">النبرة</span>
            <div className="flex flex-wrap gap-2">
              {STYLES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => nico.updateVoiceProfile({ style: t.id })}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    nico.voiceProfile.style === t.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">اللغة</span>
            <div className="flex gap-2">
              {(["ar", "en"] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => nico.updateVoiceProfile({ language: lang })}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    nico.voiceProfile.language === lang
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {lang === "ar" ? "العربية" : "English"}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            التسجيل يتوقف تلقائياً بعد صمتك، وكلمة الإيقاظ «يا نيكو» تعمل داخل الأوامر المنطوقة؛
            الاستماع الدائم للكلمة جاهز معمارياً وسيُفعّل لاحقاً.
          </p>
        </section>
      )}
    </main>
  );
}
