import type { Intent, SkillResult } from "../shared/types";
import { NICO_PERSONALITY } from "./personality";

/**
 * Blends skill output + reasoning output into one spoken utterance.
 * Nico speaks — he does not send message blobs.
 */
export class ResponseEngine {
  compose(opts: {
    intent: Intent;
    reasoning: string;
    skillResults: SkillResult[];
    firstTurn: boolean;
    userName?: string;
  }): string {
    const facts = opts.skillResults.filter((r) => r.ok).map((r) => r.speech);
    const parts: string[] = [];

    if (opts.firstTurn && opts.intent.name === "greeting") {
      parts.push(NICO_PERSONALITY.greeting(opts.userName));
    }
    parts.push(...facts);
    if (opts.reasoning) parts.push(opts.reasoning);

    const failed = opts.skillResults.filter((r) => !r.ok);
    if (failed.length) parts.push(NICO_PERSONALITY.apology);

    return parts.join(" ").replace(/\s+/g, " ").trim();
  }
}
