import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { NICO_AUTO_GREETING } from "@/packages/core/personality";
import type { PermissionKey, PermissionState } from "@/packages/shared/types";

/**
 * First-run experience for the Android app.
 * Avatar first, then microphone, notifications, language and account —
 * nothing is requested before the user taps its step, and the flow ends with
 * Nico speaking, never with a text box.
 */
export function MobileOnboarding({
  isAuthenticated,
  language,
  onLanguage,
  onRequest,
  onDone,
}: {
  isAuthenticated: boolean;
  language: "ar" | "en";
  onLanguage: (lang: "ar" | "en") => void;
  onRequest: (key: PermissionKey) => Promise<PermissionState>;
  onDone: () => void;
}) {
  const [mic, setMic] = useState<PermissionState>("prompt");
  const [notify, setNotify] = useState<PermissionState>("prompt");
  const [busy, setBusy] = useState<PermissionKey | null>(null);

  const ask = async (key: PermissionKey, set: (s: PermissionState) => void) => {
    setBusy(key);
    try {
      set(await onRequest(key));
    } finally {
      setBusy(null);
    }
  };

  const stateClass = (s: PermissionState) =>
    s === "granted"
      ? "border-accent/50 bg-accent/15 text-accent"
      : s === "denied"
        ? "border-destructive/40 bg-destructive/10 text-destructive"
        : "border-border bg-secondary text-secondary-foreground";

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background px-6 py-10"
      role="dialog"
      aria-modal="true"
      aria-label="تهيئة نيكو"
    >
      <div className="mx-auto w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="nico-orb h-32 w-32 rounded-full animate-breathe" aria-hidden />
          <h1 className="text-xl font-bold">نيكو</h1>
          <p className="text-balance text-sm leading-relaxed text-muted-foreground">
            {NICO_AUTO_GREETING}
          </p>
        </div>

        <div className="space-y-2">
          <span className="text-xs text-muted-foreground">١ — الميكروفون (ضروري)</span>
          <button
            type="button"
            disabled={busy === "microphone"}
            onClick={() => void ask("microphone", setMic)}
            className={`w-full rounded-2xl border px-4 py-3 text-sm transition-colors ${stateClass(mic)}`}
          >
            {mic === "granted"
              ? "الميكروفون مفعّل"
              : mic === "denied"
                ? "تم الرفض — يمكن السماح لاحقاً من الإعدادات"
                : "السماح بالميكروفون حتى أسمعك"}
          </button>
        </div>

        <div className="space-y-2">
          <span className="text-xs text-muted-foreground">٢ — الإشعارات</span>
          <button
            type="button"
            disabled={busy === "notifications"}
            onClick={() => void ask("notifications", setNotify)}
            className={`w-full rounded-2xl border px-4 py-3 text-sm transition-colors ${stateClass(notify)}`}
          >
            {notify === "granted"
              ? "الإشعارات مفعّلة"
              : notify === "denied"
                ? "بدون إشعارات — لن أذكّرك بالمواعيد"
                : "السماح بالإشعارات لأذكّرك في وقتها"}
          </button>
        </div>

        <div className="space-y-2">
          <span className="text-xs text-muted-foreground">٣ — لغة المحادثة</span>
          <div className="flex gap-2">
            {(["ar", "en"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => onLanguage(lang)}
                className={`flex-1 rounded-2xl border px-4 py-3 text-sm transition-colors ${
                  language === lang
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground"
                }`}
              >
                {lang === "ar" ? "العربية" : "English"}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-xs text-muted-foreground">٤ — الحساب</span>
          {isAuthenticated ? (
            <p className="rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-accent">
              أنت مسجل — ذاكرتك محفوظة في حسابك.
            </p>
          ) : (
            <div className="flex gap-2">
              <Link
                to="/auth"
                className="flex-1 rounded-2xl bg-primary px-4 py-3 text-center text-sm font-medium text-primary-foreground"
              >
                تسجيل الدخول
              </Link>
              <button
                type="button"
                onClick={onDone}
                className="flex-1 rounded-2xl border border-border px-4 py-3 text-sm text-muted-foreground"
              >
                متابعة كضيف
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onDone}
          className="w-full rounded-2xl bg-primary px-4 py-4 text-base font-semibold text-primary-foreground disabled:opacity-50"
          disabled={mic !== "granted"}
        >
          ابدأ التحدث مع نيكو
        </button>
        {mic !== "granted" && (
          <p className="text-center text-xs text-muted-foreground">
            نيكو يحتاج الميكروفون ليعمل بالصوت أولاً.
          </p>
        )}
      </div>
    </div>
  );
}
