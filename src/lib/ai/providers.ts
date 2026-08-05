/**
 * Thin adapter - FIXED FOR TERMUX
 */

import type { AiConfig } from "./ai.config";
import { LocalAIEngine } from "./LocalAIEngine";

type Headers = Record<string, string>;

function authHeaders(cfg: AiConfig, extra: Headers = {}): Headers {
  return {
    Authorization: `Bearer ${cfg.apiKey}`,
    ...extra,
  };
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  model?: string;
  messages: ChatMessage[];
  jsonMode?: boolean;
}

export async function chat(cfg: AiConfig, opts: ChatOptions): Promise<Response> {
  if (cfg.isLocal) {
    const userMsg = [...opts.messages].reverse().find((m) => m.role === "user")?.content || "";
    const systemMemory =
      opts.messages.find((m) => m.content.startsWith("ما أعرفه عن المستخدم"))?.content || "";

    const result = LocalAIEngine.processThink({
      transcript: userMsg,
      history: opts.messages.map((m) => ({ role: m.role, content: m.content })),
      memoryDigest: systemMemory,
    });

    const bodyContent = opts.jsonMode ? JSON.stringify(result) : result.speech;

    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: bodyContent,
            },
          },
        ],
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  try {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: authHeaders(cfg, { "Content-Type": "application/json" }),
      body: JSON.stringify({
        model: opts.model || cfg.chatModel,
        messages: opts.messages,
        ...(opts.jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    return res;
  } catch (err) {
    // Graceful offline fallback
    const userMsg = [...opts.messages].reverse().find((m) => m.role === "user")?.content || "";
    const result = LocalAIEngine.processThink({ transcript: userMsg });
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: JSON.stringify(result) } }],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }
}

export interface TranscribeOptions {
  file: File;
  language?: string;
  prompt?: string;
  model?: string;
}

export async function transcribe(cfg: AiConfig, opts: TranscribeOptions): Promise<Response> {
  if (cfg.isLocal) {
    return new Response(JSON.stringify({ text: "", language: "ar", fallbackToClient: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const form = new FormData();
    form.append("model", opts.model || cfg.sttModel);
    form.append("file", opts.file, opts.file.name || "recording.wav");
    if (opts.prompt) form.append("prompt", opts.prompt);
    if (opts.language) form.append("language", opts.language);
    return await fetch(`${cfg.baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: authHeaders(cfg),
      body: form,
    });
  } catch {
    return new Response(JSON.stringify({ text: "", language: "ar", fallbackToClient: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export interface SpeakOptions {
  text: string;
  voice?: string;
  speed?: number;
  instructions?: string;
  model?: string;
  streaming?: boolean;
  format?: string;
}

export async function speak(cfg: AiConfig, opts: SpeakOptions): Promise<Response> {
  if (cfg.isLocal) {
    return new Response(JSON.stringify({ status: "ok", fallbackToClient: true, text: opts.text }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const res = await fetch(`${cfg.baseUrl}/audio/speech`, {
      method: "POST",
      headers: authHeaders(cfg, { "Content-Type": "application/json" }),
      body: JSON.stringify({
        model: opts.model || cfg.ttsModel,
        input: opts.text,
        voice: opts.voice || cfg.ttsVoice,
        response_format: "mp3",
      }),
    });
    if (res.ok) return res;
  } catch {
    // ignore
  }

  return new Response(JSON.stringify({ status: "ok", fallbackToClient: true, text: opts.text }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
