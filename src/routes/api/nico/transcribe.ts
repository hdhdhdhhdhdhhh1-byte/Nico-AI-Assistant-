import { createFileRoute } from "@tanstack/react-router";
import { aiClient } from "@/lib/ai/ai.server";
import { spawn } from "child_process";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";
import { existsSync } from "fs";

export const Route = createFileRoute("/api/nico/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const formData = await request.formData().catch(() => null);
        const audio = formData?.get("audio");

        if (!(audio instanceof File)) {
          return Response.json({ text: "", language: "ar", fallbackToClient: true });
        }

        // Try AI client first if configured externally
        const config = (await import("@/lib/ai/ai.config")).getAiConfig();
        if (!config.isLocal) {
          try {
            const res = await aiClient.transcribe({ file: audio, language: "ar" });
            if (res.ok) {
              const data = await res.json().catch(() => null);
              if (data?.text) {
                return Response.json({ text: data.text, language: "ar" });
              }
            }
          } catch (e) {
            console.warn("[STT] External STT failed, trying local whisper/client fallback", e);
          }
        }

        // Check if local whisper CLI binary exists
        const whisperBin = "/data/data/com.termux/files/home/whisper.cpp/build/bin/whisper-cli";
        const whisperModel = "/data/data/com.termux/files/home/whisper.cpp/models/ggml-base.bin";

        if (!existsSync(whisperBin) || !existsSync(whisperModel)) {
          // Binary not present -> return graceful fallback to client STT
          return Response.json({ text: "", language: "ar", fallbackToClient: true });
        }

        const id = randomUUID();
        const input = join(tmpdir(), `nico-${id}.wav`);

        try {
          const buffer = Buffer.from(await audio.arrayBuffer());
          await writeFile(input, buffer);

          const text = await new Promise<string>((resolve) => {
            let output = "";

            const whisper = spawn(whisperBin, [
              "-m",
              whisperModel,
              "-f",
              input,
              "-l",
              "ar",
              "--no-timestamps",
              "--no-prints",
            ]);

            whisper.stdout.on("data", (data) => {
              output += data.toString();
            });

            whisper.stderr.on("data", (data) => {
              console.error("whisper:", data.toString());
            });

            whisper.on("error", (err) => {
              console.warn("whisper spawn error caught safely:", err.message);
              resolve("");
            });

            whisper.on("close", (code) => {
              if (code === 0) {
                resolve(output.trim());
              } else {
                resolve("");
              }
            });
          });

          return Response.json({
            text,
            language: "ar",
            fallbackToClient: !text,
          });
        } catch (error) {
          console.warn("[STT] Local whisper process error caught:", error);
          return Response.json({ text: "", language: "ar", fallbackToClient: true });
        } finally {
          await unlink(input).catch(() => {});
        }
      },
    },
  },
});
