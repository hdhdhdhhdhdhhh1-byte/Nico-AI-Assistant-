import type { ResponseStyle, ReasoningDecision, RichIntent } from "../../shared/agent";
import type { SkillResult } from "../../shared/types";
import { NICO_PERSONALITY } from "../personality";

export interface ComposeInput {
  intent: RichIntent;
  decision: ReasoningDecision;
  reasoning: string;
  skillResults: SkillResult[];
  firstTurn: boolean;
  userName?: string;
  referenceNote?: string;
}

export interface SpokenResponse {
  /** Text to speak. */
  speech: string;
  style: ResponseStyle;
  /** Voice delivery hints consumed by the TTS layer. */
  voice: { rate: number; pauseAfterMs: number };
}

const STYLE_VOICE: Record<ResponseStyle, { rate: number; pauseAfterMs: number }> = {
  brief: { rate: 1, pauseAfterMs: 120 },
  informative: { rate: 0.98, pauseAfterMs: 200 },
  confirming: { rate: 1.04, pauseAfterMs: 100 },
  empathetic: { rate: 0.95, pauseAfterMs: 260 },
  playful: { rate: 1.06, pauseAfterMs: 120 },
};

/**
 * Response Engine.
 * Merges skill facts and model reasoning into one natural, spoken utterance
 * that stays in Nico's voice regardless of which path produced the content.
 */
export class ResponseComposer {
  compose(input: ComposeInput): SpokenResponse {
    const { intent, decision } = input;
    const parts: string[] = [];

    if (input.firstTurn && intent.name === "greeting") {
      parts.push(NICO_PERSONALITY.greeting(input.userName));
    }

    parts.push(...input.skillResults.filter((r) => r.ok).map((r) => r.speech));

    if (input.reasoning) parts.push(input.reasoning);

    for (const b of decision.blocked) {
      parts.push(`أحتاج إذن ${b.missing.join(" و")} حتى أنفذ ${b.step.description}.`);
    }

    const failed = input.skillResults.filter((r) => !r.ok && r.error !== "permission_denied");
    if (failed.length) parts.push(NICO_PERSONALITY.apology);

    if (!parts.length) parts.push("تمام.");

    const speech = this.polish(parts.join(" "), decision.style);
    return { speech, style: decision.style, voice: STYLE_VOICE[decision.style] };
  }

  private polish(text: string, style: ResponseStyle): string {
    let out = text
      .replace(/\s+/g, " ")
      .replace(/\s+([.،؟!])/g, "$1")
      .trim();
    if (style === "brief") {
      const sentences = out.split(/(?<=[.؟!])\s+/).slice(0, 2);
      out = sentences.join(" ");
    }
    return out;
  }
}
