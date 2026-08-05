/**
 * WakeWordManager — structure for "يا نيكو" / "Hey Nico".
 *
 * Two detection backends exist:
 *  - the text matcher, used against finished transcripts (always available);
 *  - a pluggable always-on detector. `createSpeechRecognitionDetector()` ships
 *    a browser-native one; Android Native will register its own later through
 *    the mobile bridge without touching the UI.
 */
export type WakeWordDetector = {
  /** Begin listening for the wake phrase. Resolves once armed. */
  arm: (onDetected: (phrase: string) => void) => Promise<void> | void;
  disarm: () => void;
};

export const WAKE_PHRASES = ["يا نيكو", "هاي نيكو", "hey nico", "hi nico", "nico"];

/** Text-based detector: cheap, exact, and always available. */
export function matchesWakeWord(text: string): string | null {
  const t = text.trim().toLowerCase();
  for (const phrase of WAKE_PHRASES) {
    if (t.startsWith(phrase) || t.includes(` ${phrase}`)) return phrase;
  }
  return null;
}

/** Strips the wake phrase so the brain sees only the actual request. */
export function stripWakeWord(text: string): string {
  const t = text.trim();
  for (const phrase of WAKE_PHRASES) {
    const re = new RegExp(`^${phrase}[\\s,،.!؟]*`, "i");
    if (re.test(t)) return t.replace(re, "").trim();
  }
  return t;
}

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

/**
 * Always-on detector built on the browser SpeechRecognition API. It runs a
 * low-cost background recognizer and fires only on the wake phrase; the real
 * request is still captured by the normal STT session.
 */
export function createSpeechRecognitionDetector(lang = "ar-SA"): WakeWordDetector | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    (
      window as unknown as {
        SpeechRecognition?: new () => SpeechRecognitionLike;
        webkitSpeechRecognition?: new () => SpeechRecognitionLike;
      }
    ).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike })
      .webkitSpeechRecognition;
  if (!Ctor) return null;

  let rec: SpeechRecognitionLike | null = null;
  let wanted = false;

  return {
    arm(onDetected) {
      wanted = true;
      rec = new Ctor();
      rec.lang = lang;
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (e) => {
        const results = Array.from(e.results as ArrayLike<ArrayLike<{ transcript: string }>>);
        for (const r of results) {
          const text = r[0]?.transcript ?? "";
          const phrase = matchesWakeWord(text);
          if (phrase) onDetected(phrase);
        }
      };
      // Browsers stop the recognizer periodically; restart while still armed.
      rec.onend = () => {
        if (wanted) {
          try {
            rec?.start();
          } catch {
            /* already starting */
          }
        }
      };
      rec.onerror = () => {};
      try {
        rec.start();
      } catch {
        /* already started */
      }
    },
    disarm() {
      wanted = false;
      try {
        rec?.stop();
      } catch {
        /* not running */
      }
      rec = null;
    },
  };
}

export class WakeWordManager {
  private detector: WakeWordDetector | null = null;
  private armed = false;
  private listeners = new Set<(phrase: string) => void>();

  /** Wake word is off until a detector is registered and enable() is called. */
  get enabled() {
    return this.armed;
  }

  get hasDetector() {
    return this.detector !== null;
  }

  registerDetector(detector: WakeWordDetector) {
    this.detector = detector;
  }

  /** Registers the browser detector when available. Returns true if one exists. */
  useDefaultDetector(lang = "ar-SA"): boolean {
    if (this.detector) return true;
    const detector = createSpeechRecognitionDetector(lang);
    if (!detector) return false;
    this.detector = detector;
    return true;
  }

  onWake(fn: (phrase: string) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private fire(phrase: string) {
    this.listeners.forEach((l) => l(phrase));
  }

  async enable(): Promise<boolean> {
    if (!this.detector) return false;
    if (this.armed) return true;
    await this.detector.arm((phrase) => this.fire(phrase));
    this.armed = true;
    return true;
  }

  disable() {
    this.detector?.disarm();
    this.armed = false;
  }

  /** Temporarily stop listening (e.g. while Nico speaks), keeping intent to resume. */
  pause() {
    if (!this.armed) return;
    this.detector?.disarm();
    this.armed = false;
  }

  /**
   * Feed a transcript through the text detector. Returns the request with the
   * wake phrase removed, or null when the phrase was absent.
   */
  consumeTranscript(text: string): string | null {
    const phrase = matchesWakeWord(text);
    if (!phrase) return null;
    this.fire(phrase);
    return stripWakeWord(text);
  }
}
