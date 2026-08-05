import { createFileRoute } from "@tanstack/react-router";
import { aiClient, type ChatOptions } from "@/lib/ai/ai.server";
import { nicoRateLimiter } from "@/lib/rate-limit.server";
import { LocalAIEngine } from "@/lib/ai/LocalAIEngine";

const SYSTEM = `أنت "نيكو"، مساعد شخصي صوتي.
- تتحدث بالعربية بلهجة طبيعية وودودة، وبالإنجليزية إذا خاطبك المستخدم بها.
- ردودك قصيرة (جملة إلى ثلاث جمل) لأنها تُنطق صوتياً، بلا رموز أو markdown أو قوائم.
- أنت تتحدث ولا ترسل رسائل مكتوبة.
- استخدم المعلومات المحفوظة عن المستخدم بشكل طبيعي.
أعد دائماً JSON فقط بالشكل:
{"speech":"...","intent":"greeting|smalltalk|question|reminder|weather|calendar|search|smart_home|memory_store|memory_recall|unknown","memories":[{"key":"...","value":"...","kind":"profile|preference|habit|fact"}]}
ضع في memories فقط المعلومات الشخصية الجديدة الجديرة بالحفظ الدائم، وإلا اتركها فارغة.`;

interface ThinkBody {
  transcript?: string;
  history?: { role: string; content: string }[];
  memoryDigest?: string;
  skillFindings?: string[];
  userName?: string;
  systemPrompt?: string;
}

export const Route = createFileRoute("/api/nico/think")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip = request.headers.get("x-forwarded-for") || "anonymous";
        const decision = nicoRateLimiter.check(ip);
        if (!decision.allowed) {
          return new Response("Too many requests", {
            status: 429,
            headers: { "Retry-After": Math.ceil(decision.retryAfterMs / 1000).toString() },
          });
        }

        const body = (await request.json().catch(() => null)) as ThinkBody | null;
        const transcript = body?.transcript?.trim();
        if (!transcript) return new Response("Missing transcript", { status: 400 });

        const systemPrompt = body?.systemPrompt?.trim() || SYSTEM;
        const context = [
          body?.memoryDigest ? `ما أعرفه عن المستخدم:\n${body.memoryDigest}` : "",
          body?.skillFindings?.length
            ? `نتائج المهارات المنفذة:\n${body.skillFindings.join("\n")}`
            : "",
        ]
          .filter(Boolean)
          .join("\n\n");

        const messages: ChatOptions["messages"] = [
          { role: "system", content: systemPrompt },
          ...(context ? [{ role: "system" as const, content: context }] : []),
          ...(body?.history ?? []).slice(-10).map((t) => ({
            role: t.role === "nico" ? ("assistant" as const) : ("user" as const),
            content: t.content,
          })),
          { role: "user" as const, content: transcript },
        ];

        try {
          const res = await aiClient.chat({ messages, jsonMode: true });

          if (res.ok) {
            const data = (await res.json()) as {
              choices?: { message?: { content?: string } }[];
            };
            const raw = data.choices?.[0]?.message?.content ?? "{}";
            try {
              const parsed = JSON.parse(raw.replace(/^```json\s*|```$/g, ""));
              return Response.json({
                speech: String(parsed.speech ?? ""),
                intent: parsed.intent ?? null,
                memories: Array.isArray(parsed.memories) ? parsed.memories.slice(0, 5) : [],
              });
            } catch {
              if (raw && raw !== "{}") {
                return Response.json({ speech: raw, intent: null, memories: [] });
              }
            }
          }
        } catch (err) {
          console.warn("[Think API] Remote AI chat failed, using LocalAIEngine fallback:", err);
        }

        // Local AI Engine Fallback
        const localResult = LocalAIEngine.processThink({
          transcript,
          history: body?.history,
          memoryDigest: body?.memoryDigest,
          userName: body?.userName,
        });

        return Response.json({
          speech: localResult.speech,
          intent: localResult.intent,
          memories: localResult.memories,
          command: localResult.command,
        });
      },
    },
  },
});
