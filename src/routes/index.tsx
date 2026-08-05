import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { NicoOrb } from "@/components/nico/NicoOrb";
import { VoiceWaves } from "@/components/nico/VoiceWaves";
import { TranscriptPanel } from "@/components/nico/TranscriptPanel";
import { PermissionsBar } from "@/components/nico/PermissionsBar";
import { WelcomeExperience, hasSeenWelcome } from "@/components/nico/WelcomeExperience";
import { useNico } from "@/hooks/useNico";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "نيكو — مساعد ذكاء اصطناعي صوتي شخصي" },
      {
        name: "description",
        content:
          "نيكو مساعد شخصي يعمل بالصوت أولاً: يفهم أوامرك، يحلل النية، يتذكر تفضيلاتك، وينفذ مهامك.",
      },
      { property: "og:title", content: "نيكو — مساعد ذكاء اصطناعي صوتي شخصي" },
      {
        property: "og:description",
        content: "تحدث مع نيكو بدل الكتابة: ذاكرة دائمة، مهارات قابلة للتوسع، وأذونات تحت سيطرتك.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NicoHome,
});

function NicoHome() {
  const nico = useNico();
  const [showWelcome, setShowWelcome] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const listening = nico.state === "listening";
  const greetedRef = useRef(false);

  useEffect(() => {
    if (!hasSeenWelcome()) setShowWelcome(true);
  }, []);

  // Voice-first: Nico speaks first on open once welcome flow is done.
  useEffect(() => {
    if (showWelcome || greetedRef.current) return;
    greetedRef.current = true;
    const t = window.setTimeout(() => {
      const lang = nico.voiceProfile.language === "en" ? "en" : "ar";
      const greeting =
        lang === "ar"
          ? "أهلاً وسهلاً، أنا نيكو مساعدك الشخصي، كيف أستطيع مساعدتك؟"
          : "Hi, I'm Nico, your personal assistant. How can I help?";
      void nico.runtime.voice.say(greeting).catch(() => {});
    }, 400);
    return () => window.clearTimeout(t);
  }, [showWelcome, nico.runtime, nico.voiceProfile.language]);

  return (
    <main
      dir="rtl"
      className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-5 py-10"
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

      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">نيكو</h1>
          <p className="text-sm text-muted-foreground">مساعدك الشخصي الصوتي</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/nico"
            className="rounded-full border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
          >
            وضع الصوت
          </Link>
          <Link
            to="/mobile"
            className="rounded-full border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
          >
            تطبيق الجوال
          </Link>
          {nico.isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                className="rounded-full border border-border bg-secondary px-4 py-2 text-sm text-secondary-foreground hover:text-foreground"
              >
                لوحة التحكم
              </Link>
              <button
                onClick={() => void nico.signOut()}
                className="rounded-full border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
              >
                خروج
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              دخول
            </Link>
          )}
        </div>
      </header>

      <section className="flex flex-col items-center gap-6 py-4">
        <NicoOrb
          state={nico.presence}
          level={nico.level}
          onPress={() => (listening ? void nico.stopListening() : void nico.startListening())}
        />
        <VoiceWaves state={nico.state} level={nico.level} />

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

        <button
          type="button"
          onClick={() => void nico.setAlwaysReady(!nico.assistant.alwaysReady)}
          className={`rounded-full border px-5 py-2 text-xs transition-colors ${
            nico.assistant.alwaysReady
              ? "border-primary/50 bg-primary/15 text-primary"
              : "border-border bg-secondary text-secondary-foreground hover:text-foreground"
          }`}
        >
          {nico.assistant.alwaysReady ? "الجاهزية الدائمة مفعّلة" : "تفعيل «يا نيكو»"}
        </button>

        {nico.lastIntent && (
          <span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
            النية المكتشفة: {nico.lastIntent}
          </span>
        )}
        {nico.error && <p className="text-sm text-destructive">{nico.error}</p>}
      </section>

      <PermissionsBar
        permissions={nico.permissions}
        onRequest={(k) => void nico.requestPermission(k)}
        onRevoke={nico.revokePermission}
      />

      <section className="space-y-3">
        <button
          type="button"
          onClick={() => setLogOpen((v) => !v)}
          aria-expanded={logOpen}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {logOpen ? "إخفاء السجل النصي" : "عرض السجل النصي (مساعد فقط)"}
        </button>
        {logOpen && <TranscriptPanel turns={nico.turns} />}
      </section>

      <footer className="pb-6 text-center text-xs text-muted-foreground">
        {nico.isAuthenticated
          ? `مسجل بـ ${nico.authEmail} — الذاكرة مخزّنة في السحابة.`
          : "أنت في وضع الضيف: الذاكرة مؤقتة محلياً فقط ولا تُحفظ بيانات حساسة."}
      </footer>
    </main>
  );
}
