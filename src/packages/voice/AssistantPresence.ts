import type { VoiceState } from "./VoiceSessionManager";

/**
 * Assistant presence — what the user perceives Nico as doing right now.
 * It extends the voice state with "sleeping": Nico is alive in the background,
 * listening only for the wake word.
 */
export type AssistantPresence = VoiceState | "sleeping";

export const PRESENCE_LABEL: Record<AssistantPresence, string> = {
  idle: "اضغط للتحدث",
  listening: "أسمعك...",
  thinking: "أفكر...",
  speaking: "أتحدث",
  sleeping: "نائم — قل «يا نيكو»",
};

export function derivePresence(
  state: VoiceState,
  opts: { wakeWordArmed?: boolean } = {},
): AssistantPresence {
  if (state === "idle" && opts.wakeWordArmed) return "sleeping";
  return state;
}
