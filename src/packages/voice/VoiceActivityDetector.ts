/**
 * VoiceActivityDetector — lightweight RMS-based VAD.
 *
 * Purpose:
 *  - detect when the user actually starts speaking (so we don't send silence),
 *  - stop the recording automatically after a trailing silence,
 *  - keep battery cost low by analysing an existing AnalyserNode on a slow
 *    interval instead of running a second audio graph or a model.
 */
export interface VadOptions {
  /** RMS threshold (0..1) above which audio counts as speech. */
  threshold?: number;
  /** Trailing silence before the utterance is considered finished. */
  silenceMs?: number;
  /** Hard cap on a single utterance. */
  maxUtteranceMs?: number;
  /** Grace period before silence can end an utterance that never started. */
  startTimeoutMs?: number;
  /** Analysis tick; larger = cheaper. */
  intervalMs?: number;
  onSpeechStart?: () => void;
  /** Fired once when the utterance is judged complete. */
  onSpeechEnd?: (reason: "silence" | "timeout") => void;
}

const DEFAULTS = {
  threshold: 0.035,
  silenceMs: 1200,
  maxUtteranceMs: 30000,
  startTimeoutMs: 6000,
  intervalMs: 100,
};

export class VoiceActivityDetector {
  private timer: ReturnType<typeof setInterval> | null = null;
  private startedAt = 0;
  private started = false;
  private lastVoiceAt = 0;
  private speaking = false;
  private done = false;
  private readonly opts: Required<Omit<VadOptions, "onSpeechStart" | "onSpeechEnd">> &
    Pick<VadOptions, "onSpeechStart" | "onSpeechEnd">;

  constructor(opts: VadOptions = {}) {
    this.opts = { ...DEFAULTS, ...opts };
  }

  /** True once speech has been detected in the current utterance. */
  get hasSpeech() {
    return this.speaking;
  }

  /** Feeds a live amplitude sample (0..1). Returns true while still running. */
  push(level: number, now = Date.now()): boolean {
    if (this.done) return false;
    if (!this.started) {
      this.started = true;
      this.startedAt = now;
      this.lastVoiceAt = now;
    }

    if (level >= this.opts.threshold) {
      this.lastVoiceAt = now;
      if (!this.speaking) {
        this.speaking = true;
        this.opts.onSpeechStart?.();
      }
    }

    if (now - this.startedAt >= this.opts.maxUtteranceMs) return this.finish("timeout");

    const quietFor = now - this.lastVoiceAt;
    if (this.speaking && quietFor >= this.opts.silenceMs) return this.finish("silence");
    if (!this.speaking && now - this.startedAt >= this.opts.startTimeoutMs) {
      return this.finish("timeout");
    }
    return true;
  }

  private finish(reason: "silence" | "timeout") {
    this.done = true;
    this.stop();
    this.opts.onSpeechEnd?.(reason);
    return false;
  }

  /** Polls `read()` on a slow interval — cheaper than a per-frame rAF loop. */
  attach(read: () => number) {
    this.stop();
    this.timer = setInterval(() => this.push(read()), this.opts.intervalMs);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
