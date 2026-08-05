import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { NicoAvatar } from "@/components/nico/NicoAvatar";
import { VoiceWaves } from "@/components/nico/VoiceWaves";
import { TranscriptPanel } from "@/components/nico/TranscriptPanel";
import { MobileOnboarding } from "@/components/nico/MobileOnboarding";
import { useNicoMobile } from "@/hooks/useNicoMobile";
import { PRESENCE_LABEL } from "@/packages/voice/AssistantPresence";
import { useOnline } from "@/hooks/useOnline";

export const Route = createFileRoute("/mobile/")({
  head: () => ({
    meta: [
      { title: "Nico AI — تطبيق المساعد الصوتي للأندرويد" },
      {
        name: "description",
        content:
          "واجهة تطبيق نيكو للهاتف: صوت أولاً، كلمة التنبيه «يا نيكو»، ذاكرة مرتبطة بحسابك، وأذونات تُطلب عند الحاجة فقط.",
      },
      { property: "og:title", content: "Nico AI — تطبيق المساعد الصوتي للأندرويد" },
      {
        property: "og:description",
        content: "نيكو على هاتفك: استماع، تفكير، ورد صوتي بنفس العقل والذاكرة.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MobileApp,
  errorComponent: MobileCrashScreen,
});

/** Crash protection: a failed render never leaves a blank phone screen. */
function MobileCrashScreen({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main dir="rtl" className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
      <div className="nico-orb h-24 w-24 rounded-full opacity-60" aria-hidden />
      <h1 className="text-lg font-semibold">توقف نيكو للحظة</h1>
      <p className="text-center text-sm text-muted-foreground">{error.message}</p>
      <button
        onClick={reset}
        className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground"
      >
        إعادة المحاولة
      </button>
    </main>
  );
}

function MobileApp() {
  const nico = useNicoMobile();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState("");
  const [logOpen, setLogOpen] = useState(false);
  const listening = nico.state === "listening";
  const online = useOnline();

  useEffect(() => {
    if (!nico.onboarded) setShowOnboarding(true);
  }, [nico.onboarded]);

  return (
    <main
      dir="rtl"
      className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-between px-5 pb-8 pt-6"
    >
      {showOnboarding && (
        <MobileOnboarding
          isAuthenticated={nico.isAuthenticated}
          language={nico.voiceProfile.language}
          onLanguage={(language) => nico.updateVoiceProfile({ language })}
          onRequest={nico.requestPermission}
          onDone={() => {
            setShowOnboarding(false);
            void nico.finishOnboarding();
          }}
        />
      )}

      {!online && (
        <div className="mb-3 rounded-2xl border border-border bg-secondary px-4 py-2 text-center text-xs text-muted-foreground">
          لا يوجد اتصال — نيكو يعمل بالذاكرة المحلية والمهارات التي لا تحتاج إنترنت.
        </div>
      )}

      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">نيكو</h1>
          <p className="text-xs text-muted-foreground">{PRESENCE_LABEL[nico.presence]}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/mobile/settings"
            className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground"
          >
            الإعدادات
          </Link>
          {!nico.isAuthenticated && (
            <Link
              to="/auth"
              className="rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
            >
              دخول
            </Link>
          )}
        </div>
      </header>

      {(nico.offline || nico.mobileError || nico.error) && (
        <div className="mt-4 space-y-2">
          {nico.offline && (
            <p className="rounded-2xl border border-border bg-secondary px-4 py-2 text-xs text-muted-foreground">
              لا يوجد اتصال — أرد على الأوامر البسيطة محلياً فقط.
            </p>
          )}
          {(nico.mobileError || nico.error) && (
            <p className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-xs text-destructive">
              {nico.mobileError ?? nico.error}
            </p>
          )}
        </div>
      )}

      <section className="flex flex-1 flex-col items-center justify-center gap-7">
        <NicoAvatar
          state={nico.presence}
          level={nico.level}
          onPress={() => void (listening ? nico.stopListening() : nico.startListening())}
        />
        <VoiceWaves state={nico.state} level={nico.level} />
        <p className="text-sm text-muted-foreground">{PRESENCE_LABEL[nico.presence]}</p>

        <div className="flex w-full flex-col gap-2">
          <button
            type="button"
            onClick={() =>
              nico.continuous ? nico.stopConversation() : void nico.startConversation()
            }
            className={`w-full rounded-2xl border px-5 py-3 text-sm transition-colors ${
              nico.continuous
                ? "border-accent/50 bg-accent/15 text-accent"
                : "border-border bg-secondary text-secondary-foreground"
            }`}
          >
            {nico.continuous ? "إيقاف المحادثة المستمرة" : "محادثة بدون يدين"}
          </button>
          <button
            type="button"
            onClick={() => void nico.setAlwaysReady(!nico.assistant.alwaysReady)}
            className={`w-full rounded-2xl border px-5 py-3 text-sm transition-colors ${
              nico.assistant.alwaysReady
                ? "border-primary/50 bg-primary/15 text-primary"
                : "border-border bg-secondary text-secondary-foreground"
            }`}
          >
            {nico.assistant.alwaysReady ? "«يا نيكو» مفعّلة" : "تفعيل كلمة «يا نيكو»"}
          </button>
          {nico.assistant.alwaysReady && (
            <p className="text-center text-[11px] text-muted-foreground">
              {nico.background === "running"
                ? "خدمة الاستماع تعمل في الخلفية."
                : "الاستماع في الواجهة فقط — خدمة الخلفية تحتاج تطبيق أندرويد مبنياً."}
            </p>
          )}
        </div>
      </section>

      <footer className="space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <button type="button" onClick={() => setTyping((v) => !v)}>
            {typing ? "إخفاء الكتابة" : "الكتابة (اختياري)"}
          </button>
          <button type="button" onClick={() => setLogOpen((v) => !v)}>
            {logOpen ? "إخفاء السجل" : "السجل"}
          </button>
        </div>

        {typing && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const value = text.trim();
              if (!value) return;
              setText("");
              void nico.sendText(value);
            }}
            className="flex gap-2"
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="اكتب لنيكو..."
              className="flex-1 rounded-2xl border border-border bg-secondary px-4 py-3 text-sm outline-none"
            />
            <button
              type="submit"
              className="rounded-2xl bg-primary px-4 py-3 text-sm text-primary-foreground"
            >
              إرسال
            </button>
          </form>
        )}

        {logOpen && <TranscriptPanel turns={nico.turns} />}

        <p className="text-center text-[11px] text-muted-foreground">
          {nico.isAuthenticated
            ? `${nico.authEmail} — الذاكرة مرتبطة بحسابك${
                nico.migratedMemories ? ` (نُقلت ${nico.migratedMemories} ذكرى من وضع الضيف)` : ""
              }.`
            : "وضع الضيف: الذاكرة محلية مؤقتة، وتُرقّى تلقائياً عند تسجيل الدخول."}
        </p>
      </footer>
    </main>
  );
}
