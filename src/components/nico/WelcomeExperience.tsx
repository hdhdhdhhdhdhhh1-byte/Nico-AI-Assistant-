import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { NICO_AUTO_GREETING } from "@/packages/core/personality";

const KEY = "nico.welcome.v1";

export const WELCOME_SPEECH = NICO_AUTO_GREETING;

export function hasSeenWelcome(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(KEY) === "done";
  } catch {
    return true;
  }
}

function markSeen() {
  try {
    window.localStorage.setItem(KEY, "done");
  } catch {
    /* ignore */
  }
}

/**
 * First-run experience: Nico asks for the
 * microphone and, as soon as it is granted, greets the user out loud, the language, and whether to sign in or continue as a guest.
 * No permission is requested before the user taps its step.
 */
export function WelcomeExperience({
  isAuthenticated,
  language,
  onLanguage,
  onRequestMic,
  onSpeak,
  onDone,
}: {
  isAuthenticated: boolean;
  language: "ar" | "en";
  onLanguage: (lang: "ar" | "en") => void;
  onRequestMic: () => Promise<"granted" | "denied" | "prompt">;
  onSpeak: (text: string) => Promise<void> | void;
  onDone: () => void;
}) {
  const [micState, setMicState] = useState<"idle" | "granted" | "denied">("idle");

  const finish = () => {
    markSeen();
    onDone();
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 px-5 backdrop-blur"
      role="dialog"
      aria-modal="true"
      aria-label="ترحيب نيكو"
    >
      <div className="w-full max-w-md space-y-7 rounded-3xl border border-border bg-card p-6 text-card-foreground">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="nico-orb h-28 w-28 rounded-full animate-breathe" aria-hidden />
          <p className="text-balance text-lg leading-relaxed">{WELCOME_SPEECH}</p>
        </div>

        <div className="space-y-2">
          <span className="text-xs text-muted-foreground">١ — إذن الميكروفون</span>
          <button
            type="button"
            onClick={async () => {
              const res = await onRequestMic();
              setMicState(res === "granted" ? "granted" : "denied");
              // Auto greeting: the moment the mic is allowed, Nico speaks first.
              if (res === "granted") {
                void Promise.resolve(onSpeak(WELCOME_SPEECH)).catch(() => {});
              }
            }}
            className={`w-full rounded-2xl border px-4 py-3 text-sm transition-colors ${
              micState === "granted"
                ? "border-accent/50 bg-accent/15 text-accent"
                : micState === "denied"
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : "border-border bg-secondary text-secondary-foreground hover:text-foreground"
            }`}
          >
            {micState === "granted"
              ? "الميكروفون مفعّل"
              : micState === "denied"
                ? "تم الرفض — يمكنك السماح لاحقاً"
                : "السماح باستخدام الميكروفون"}
          </button>
        </div>

        <div className="space-y-2">
          <span className="text-xs text-muted-foreground">٢ — لغة المحادثة</span>
          <div className="flex gap-2">
            {(["ar", "en"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => onLanguage(lang)}
                className={`flex-1 rounded-2xl border px-4 py-3 text-sm transition-colors ${
                  language === lang
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {lang === "ar" ? "العربية" : "English"}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-xs text-muted-foreground">٣ — الحساب</span>
          <div className="flex gap-2">
            {!isAuthenticated && (
              <Link
                to="/auth"
                onClick={markSeen}
                className="flex-1 rounded-2xl bg-primary px-4 py-3 text-center text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                تسجيل الدخول
              </Link>
            )}
            <button
              type="button"
              onClick={finish}
              className="flex-1 rounded-2xl border border-border px-4 py-3 text-sm text-muted-foreground hover:text-foreground"
            >
              {isAuthenticated ? "ابدأ" : "المتابعة كضيف"}
            </button>
          </div>
          {!isAuthenticated && (
            <p className="text-xs text-muted-foreground">
              كضيف: الذاكرة محلية ومؤقتة فقط، ولا يُحفظ أي شيء حساس.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
