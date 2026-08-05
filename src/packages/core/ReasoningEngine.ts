import type { ConversationTurn, IntentName } from "../shared/types";
import { LocalAIEngine } from "@/lib/ai/LocalAIEngine";

export interface ReasoningInput {
  transcript: string;
  history: ConversationTurn[];
  memoryDigest: string;
  skillFindings: string[];
  userName?: string;
  systemPrompt?: string;
}

export interface ReasoningOutput {
  speech: string;
  intent: IntentName | null;
  memories: {
    key: string;
    value: string;
    kind: "profile" | "preference" | "habit" | "fact" | "event";
  }[];
}

/**
 * On-device local reasoning engine powered by LocalAIEngine with optional remote API.
 */
export class ReasoningEngine {
  constructor(private readonly endpoint = "/api/nico/think") {}

  async reason(input: ReasoningInput): Promise<ReasoningOutput> {
    // 1. Always try LocalAIEngine first for zero-latency offline performance
    const localRes = LocalAIEngine.processThink({
      transcript: input.transcript,
      history: input.history?.map((h) => ({ role: h.role, content: h.content })),
      memoryDigest: input.memoryDigest,
      userName: input.userName,
    });

    if (localRes.speech && localRes.intent) {
      return {
        speech: localRes.speech,
        intent: localRes.intent as IntentName,
        memories: localRes.memories || [],
      };
    }

    // 2. Optional remote fetch fallback if network is available
    try {
      const res = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (res.ok) {
        const data = (await res.json()) as Partial<ReasoningOutput>;
        return {
          speech: data.speech?.trim() || localRes.speech,
          intent: data.intent ?? (localRes.intent as IntentName),
          memories: data.memories ?? localRes.memories,
        };
      }
    } catch {
      // ignore network errors
    }

    return {
      speech: localRes.speech,
      intent: (localRes.intent as IntentName) || "smalltalk",
      memories: localRes.memories || [],
    };
  }
}
