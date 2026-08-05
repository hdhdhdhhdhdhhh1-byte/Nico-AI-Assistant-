import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useNico } from "@/hooks/useNico";
import { nicoSync } from "@/lib/nicoSync";
import { OfflineStore } from "@/packages/offline";

export const Route = createFileRoute("/_authenticated/privacy")({
  head: () => ({
    meta: [
      { title: "مركز الخصوصية — نيكو" },
      {
        name: "description",
        content: "تحكم كامل ببياناتك في نيكو: تصدير، حذف الذاكرة، تعطيل التعلم، وحذف الحساب.",
      },
      { property: "og:title", content: "مركز الخصوصية — نيكو" },
      {
        property: "og:description",
        content: "بياناتك ملكك: صدّرها، احذف الذاكرة، أوقف التعلم، أو احذف الحساب بالكامل.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PrivacyCenter,
});

const CARD = "space-y-3 rounded-3xl border border-border bg-card/40 p-5";

function PrivacyCenter() {
  const nico = useNico();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [learningOn, setLearningOn] = useState(true);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem("nico.learning.enabled.v1");
      if (v === "false") setLearningOn(false);
    } catch {
      /* ignore */
    }
  }, []);

  async function run(name: string, fn: () => Promise<unknown>, done: string) {
    setBusy(name);
    setMsg(null);
    try {
      await fn();
      setMsg(done);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "حدث خطأ.");
    } finally {
      setBusy(null);
    }
  }

  const exportData = () =>
    run(
      "export",
      async () => {
        const data = await nicoSync.exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `nico-export-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      },
      "تم تنزيل بياناتك.",
    );

  const wipeMemories = () =>
    run(
      "wipe",
      async () => {
        if (!window.confirm("سيتم حذف كل ذاكرة نيكو عنك بشكل نهائي. هل أنت متأكد؟")) return;
        await nicoSync.deleteAllMemories();
        nico.runtime.memory.forgetAll();
        OfflineStore.clear();
      },
      "تم حذف الذاكرة.",
    );

  const deleteAccount = () =>
    run(
      "account",
      async () => {
        if (!window.confirm("سيتم حذف حسابك وكل بياناتك بلا رجعة. هل أنت متأكد؟")) return;
        await nicoSync.deleteAccount();
        OfflineStore.clear();
        await nico.signOut();
        window.location.href = "/";
      },
      "تم حذف الحساب.",
    );

  const toggleLearning = (next: boolean) => {
    setLearningOn(next);
    try {
      window.localStorage.setItem("nico.learning.enabled.v1", next ? "true" : "false");
    } catch {
      /* ignore */
    }
    setMsg(next ? "تم تفعيل التعلّم." : "تم تعطيل التعلّم.");
  };

  return (
    <main dir="rtl" className="mx-auto w-full max-w-2xl space-y-6 px-5 py-10">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">مركز الخصوصية</h1>
        <Link to="/settings" className="text-xs text-muted-foreground hover:text-foreground">
          ← الإعدادات
        </Link>
      </header>

      <p className="text-sm text-muted-foreground">
        كل بياناتك في نيكو ملكك. من هنا يمكنك تصديرها، حذفها، أو التحكم بما يتعلمه عنك.
      </p>

      <section className={CARD}>
        <h2 className="text-lg font-semibold">تصدير البيانات</h2>
        <p className="text-sm text-muted-foreground">
          تنزيل ملف JSON يحتوي ملفك، محادثاتك، ذاكرتك، وتعلّمك.
        </p>
        <button
          onClick={exportData}
          disabled={busy === "export"}
          className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
        >
          {busy === "export" ? "جاري التحضير…" : "تنزيل بياناتي"}
        </button>
      </section>

      <section className={CARD}>
        <h2 className="text-lg font-semibold">التعلّم الذكي</h2>
        <p className="text-sm text-muted-foreground">
          يتعلم نيكو تفضيلاتك تلقائياً من محادثاتك. يمكنك إيقافه في أي وقت.
        </p>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={learningOn}
            onChange={(e) => toggleLearning(e.target.checked)}
          />
          <span>{learningOn ? "التعلّم مفعّل" : "التعلّم موقوف"}</span>
        </label>
      </section>

      <section className={CARD}>
        <h2 className="text-lg font-semibold">حذف الذاكرة</h2>
        <p className="text-sm text-muted-foreground">
          يحذف كل ما يتذكره نيكو عنك — لكن يبقى حسابك.
        </p>
        <button
          onClick={wipeMemories}
          disabled={busy === "wipe"}
          className="rounded-full border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive disabled:opacity-50"
        >
          {busy === "wipe" ? "…" : "حذف كل الذاكرة"}
        </button>
      </section>

      <section className={CARD}>
        <h2 className="text-lg font-semibold text-destructive">حذف الحساب</h2>
        <p className="text-sm text-muted-foreground">
          يحذف حسابك وكل بياناتك (ملف، محادثات، ذاكرة، تعلّم) نهائياً.
        </p>
        <button
          onClick={deleteAccount}
          disabled={busy === "account"}
          className="rounded-full bg-destructive px-4 py-2 text-sm text-destructive-foreground disabled:opacity-50"
        >
          {busy === "account" ? "…" : "حذف حسابي نهائياً"}
        </button>
      </section>

      {msg && <p className="text-center text-sm text-muted-foreground">{msg}</p>}
    </main>
  );
}
