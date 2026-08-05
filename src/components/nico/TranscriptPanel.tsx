import type { ConversationTurn } from "@/packages/shared/types";

export function TranscriptPanel({ turns }: { turns: ConversationTurn[] }) {
  if (!turns.length) {
    return (
      <div className="nico-panel p-6 text-center text-sm text-muted-foreground">
        ابدأ الحديث مع نيكو — قل مثلاً «ذكرني أشرب ماء بعد 20 دقيقة» أو «كيف الطقس؟»
      </div>
    );
  }

  return (
    <div className="nico-panel max-h-72 space-y-3 overflow-y-auto p-5">
      {turns.map((t) => (
        <div
          key={t.id}
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            t.role === "user"
              ? "bg-secondary text-secondary-foreground"
              : "bg-primary/12 text-foreground"
          }`}
        >
          <span className="mb-1 block text-xs font-semibold text-muted-foreground">
            {t.role === "user" ? "أنت" : "نيكو"}
          </span>
          {t.content}
        </div>
      ))}
    </div>
  );
}
