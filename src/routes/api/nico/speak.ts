import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { aiClient } from "@/lib/ai/ai.server";
import { nicoRateLimiter } from "@/lib/rate-limit.server";

const BodySchema = z.object({
  text: z.string().min(1).max(4000),
  voice: z.string().max(40).optional(),
  speed: z.number().min(0.5).max(2).optional(),
  instructions: z.string().max(500).optional(),
});

export const Route = createFileRoute("/api/nico/speak")({
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

        const raw = await request.json().catch(() => null);
        const parsed = BodySchema.safeParse(raw);
        if (!parsed.success) return new Response("Invalid speech request", { status: 400 });
        const { text, voice, speed, instructions } = parsed.data;

        try {
          const res = await aiClient.speak({
            text,
            voice,
            speed,
            instructions:
              instructions ||
              "Speak warmly and naturally, like a friendly personal assistant talking to a friend.",
            streaming: true,
            format: "pcm",
          });

          if (res.ok && res.body) {
            const contentType = res.headers.get("content-type") || "";
            if (contentType.includes("json")) {
              const data = await res.json().catch(() => null);
              if (data?.fallbackToClient) {
                return Response.json({ status: "ok", fallbackToClient: true, text });
              }
            }
            return new Response(res.body, {
              headers: { "Content-Type": contentType || "audio/wav", "Cache-Control": "no-cache" },
            });
          }
        } catch (e) {
          console.warn("[TTS API] Remote TTS failed, using client fallback:", e);
        }

        return Response.json({ status: "ok", fallbackToClient: true, text });
      },
    },
  },
});
