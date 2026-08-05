/**
 * Public entry point for AI calls.
 *
 * Server routes call these helpers instead of hitting a hard-coded gateway.
 */

import { getAiConfig } from "./ai.config";
import {
  chat,
  transcribe,
  speak,
  type ChatOptions,
  type TranscribeOptions,
  type SpeakOptions,
} from "./providers";

export class AiUnavailableError extends Error {
  constructor() {
    super("AI provider not configured. Set AI_API_KEY (and optionally AI_API_URL / AI_MODEL).");
    this.name = "AiUnavailableError";
  }
}

function requireConfig() {
  const cfg = getAiConfig();
  if (!cfg) throw new AiUnavailableError();
  return cfg;
}

export const aiClient = {
  chat: (opts: ChatOptions) => chat(requireConfig(), opts),
  transcribe: (opts: TranscribeOptions) => transcribe(requireConfig(), opts),
  speak: (opts: SpeakOptions) => speak(requireConfig(), opts),
  isConfigured: () => getAiConfig() !== null,
};

export type { ChatOptions, TranscribeOptions, SpeakOptions };
