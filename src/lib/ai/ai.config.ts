/**
 * AI provider configuration.
 *
 * All settings come from environment variables so the project can point at any
 * OpenAI-compatible gateway (OpenAI, OpenRouter, Groq, self-hosted, or the
 * legacy Lovable AI Gateway) without code changes.
 *
 *   AI_PROVIDER   free-form label (openai | gemini | anthropic | custom …)
 *   AI_API_URL    base URL, e.g. https://api.openai.com/v1
 *   AI_API_KEY    bearer token
 *   AI_MODEL      default chat model
 *   AI_STT_MODEL  speech-to-text model  (optional)
 *   AI_TTS_MODEL  text-to-speech model  (optional)
 *   AI_TTS_VOICE  default TTS voice     (optional)
 */

export interface AiConfig {
  provider: string;
  baseUrl: string;
  apiKey: string;
  chatModel: string;
  sttModel: string;
  ttsModel: string;
  ttsVoice: string;
  isLocal: boolean;
}

export function getAiConfig(): AiConfig {
  const apiKey =
    process.env.AI_API_KEY || process.env.OPENAI_API_KEY || process.env.LOVABLE_API_KEY || "";
  const baseUrl =
    process.env.AI_API_URL ||
    (process.env.LOVABLE_API_KEY
      ? "https://ai.gateway.lovable.dev/v1"
      : "https://api.openai.com/v1");

  const isLocal = !apiKey;

  return {
    provider: process.env.AI_PROVIDER || (isLocal ? "local" : "openai"),
    baseUrl: baseUrl.replace(/\/+$/, ""),
    apiKey: apiKey || "local-key",
    chatModel: process.env.AI_MODEL || "local-nico-model",
    sttModel: process.env.AI_STT_MODEL || "local-stt",
    ttsModel: process.env.AI_TTS_MODEL || "local-tts",
    ttsVoice: process.env.AI_TTS_VOICE || "ar-local",
    isLocal,
  };
}
