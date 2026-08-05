import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — نيكو" },
      { name: "description", content: "سجّل دخولك للوصول إلى ذاكرة نيكو الدائمة ومحادثاتك." },
      { property: "og:title", content: "تسجيل الدخول — نيكو" },
      { property: "og:description", content: "ادخل إلى حسابك في منصة نيكو." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then((res) => {
        if (res?.data?.session) navigate({ to: "/dashboard" });
      })
      .catch(() => {});
  }, [navigate]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { name },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/dashboard" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError(result.error.message || "تعذر تسجيل الدخول بجوجل.");
      return;
    }
    if (!result.redirected) navigate({ to: "/dashboard" });
  }

  return (
    <main
      dir="rtl"
      className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6 py-10"
    >
      <div className="text-center">
        <h1 className="text-3xl font-bold">نيكو</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "signin" ? "أهلاً بعودتك، سجّل دخولك." : "أنشئ حساباً جديداً لتبدأ."}
        </p>
      </div>

      <button
        onClick={handleGoogle}
        className="rounded-full border border-border bg-card px-5 py-3 text-sm font-medium hover:bg-secondary"
      >
        متابعة باستخدام Google
      </button>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        <span>أو بالبريد الإلكتروني</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleEmail} className="flex flex-col gap-3">
        {mode === "signup" && (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="الاسم"
            className="rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-ring"
          />
        )}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="البريد الإلكتروني"
          required
          className="rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-ring"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="كلمة المرور"
          required
          minLength={6}
          className="rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-ring"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy ? "..." : mode === "signin" ? "دخول" : "إنشاء حساب"}
        </button>
      </form>

      <button
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        {mode === "signin" ? "ما عندك حساب؟ سجّل الآن" : "عندك حساب؟ دخول"}
      </button>
    </main>
  );
}
