export type Emotion = "neutral" | "sad" | "happy" | "angry" | "tired";

export interface EmotionReading {
  emotion: Emotion;
  confidence: number;
  /** Suggested tonal adjustment for the response layer. */
  suggestedTone: "warm" | "empathetic" | "calm" | "cheerful" | "neutral";
}

const SIGNS: { emotion: Emotion; patterns: RegExp[] }[] = [
  { emotion: "sad", patterns: [/حزين|زعلان|مكتئب|تعبان نفسياً|sad|down|depressed/i] },
  { emotion: "tired", patterns: [/تعبان|مرهق|منهك|ما عندي طاقة|tired|exhausted|worn out/i] },
  { emotion: "angry", patterns: [/غاضب|زهقان|معصب|angry|furious|annoyed/i] },
  { emotion: "happy", patterns: [/سعيد|فرحان|مبسوط|رائع|excited|happy|great news/i] },
];

/**
 * Emotion Analysis Layer.
 * Lightweight lexical check used only to adjust Nico's tone — NOT a
 * medical or diagnostic signal.
 */
export class EmotionAnalyzer {
  detect(text: string): EmotionReading {
    const t = text.trim();
    if (!t) return { emotion: "neutral", confidence: 0, suggestedTone: "neutral" };
    for (const s of SIGNS) {
      if (s.patterns.some((p) => p.test(t))) {
        return {
          emotion: s.emotion,
          confidence: 0.7,
          suggestedTone: this.toneFor(s.emotion),
        };
      }
    }
    return { emotion: "neutral", confidence: 0.3, suggestedTone: "neutral" };
  }

  private toneFor(e: Emotion): EmotionReading["suggestedTone"] {
    switch (e) {
      case "sad":
        return "warm";
      case "tired":
        return "calm";
      case "angry":
        return "empathetic";
      case "happy":
        return "cheerful";
      default:
        return "neutral";
    }
  }
}
