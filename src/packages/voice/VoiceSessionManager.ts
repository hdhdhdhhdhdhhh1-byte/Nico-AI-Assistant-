import { SpeechToText, type SttHandle, type TranscriptionResult } from "./SpeechToText";
import { TextToSpeech } from "./TextToSpeech";
import { VoiceProfile } from "./VoiceProfile";
import { LocalVoiceCache } from "./LocalVoiceCache";
import { WakeWordManager } from "./WakeWordManager";

export type VoiceState = "idle" | "listening" | "thinking" | "speaking";

/** Everything measured about a single spoken exchange. */
export interface VoiceSession {
  id: string;
  startedAt: number;
  endedAt?: number;
  durationMs: number;
  language: string;
  confidence?: number;
  transcript?: string;
  reply?: string;
  wakeWord?: string;
}

export interface VoiceSessionHooks {
  /** Called once a session completes (transcript captured or aborted). */
  onSessionEnd?: (session: VoiceSession) => void;
  /** Fired when voice activity detection ends the utterance by itself. */
  onAutoStop?: (reason: "silence" | "timeout") => void;
  /** Fired the moment the user actually starts speaking. */
  onSpeechStart?: () => void;
}

/**
 * VoiceSessionManager owns the microphone session lifecycle:
 * start recording → stop recording → transcribe → speak the reply,
 * while tracking timing/language/confidence metadata for persistence.
 */
export class VoiceSessionManager {
  readonly profile = new VoiceProfile();
  readonly cache = new LocalVoiceCache();
  readonly wakeWord = new WakeWordManager();

  private stt = new SpeechToText();
  private tts = new TextToSpeech();
  private handle: SttHandle | null = null;
  private state: VoiceState = "idle";
  private listeners = new Set<(s: VoiceState) => void>();
  private session: VoiceSession | null = null;
  private hooks: VoiceSessionHooks;

  constructor(hooks: VoiceSessionHooks = {}) {
    this.hooks = hooks;
  }

  setHooks(hooks: VoiceSessionHooks) {
    this.hooks = { ...this.hooks, ...hooks };
  }

  get current() {
    return this.state;
  }

  get activeSession() {
    return this.session;
  }

  subscribe(fn: (s: VoiceState) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  protected set(s: VoiceState) {
    this.state = s;
    this.listeners.forEach((l) => l(s));
  }

  /** Live amplitude 0..1 for the orb and waveform. */
  level(): number {
    if (this.state === "listening") return this.handle?.level() ?? 0;
    if (this.state === "speaking") return this.tts.level();
    return 0;
  }

  /** True while the conversation loop should re-arm after Nico finishes speaking. */
  continuous = false;

  /** Did the detector hear speech in the current utterance? */
  heardSpeech() {
    return this.handle?.hasSpeech() ?? false;
  }

  async startListening() {
    this.tts.stop();
    this.handle = await this.stt.start({
      onSpeechStart: () => this.hooks.onSpeechStart?.(),
      onAutoStop: (reason) => this.hooks.onAutoStop?.(reason),
    });
    this.session = {
      id: crypto.randomUUID(),
      startedAt: Date.now(),
      durationMs: 0,
      language: this.profile.data.language,
    };
    this.set("listening");
  }

  /** Stops recording and returns the transcription plus its metadata. */
  async stopListening(): Promise<TranscriptionResult> {
    if (!this.handle) return { text: "", language: this.profile.data.language, durationMs: 0 };
    const h = this.handle;
    this.handle = null;
    this.set("thinking");
    try {
      const result = await h.stop(this.profile.data.language);
      if (this.session) {
        this.session.durationMs = result.durationMs;
        this.session.language = result.language;
        this.session.confidence = result.confidence;
        this.session.transcript = result.text;

        const stripped = this.wakeWord.consumeTranscript(result.text);
        if (stripped !== null) {
          this.session.wakeWord = "detected";
          result.text = stripped || result.text;
        }
      }
      return result;
    } catch (e) {
      this.endSession();
      this.set("idle");
      throw e;
    }
  }

  /** Answer without the network when the request is locally resolvable. */
  resolveOffline(utterance: string): string | null {
    if (!LocalVoiceCache.isOffline()) return null;
    return this.cache.resolveOffline(utterance);
  }

  cancel() {
    this.continuous = false;
    this.handle?.cancel();
    this.handle = null;
    this.tts.stop();
    this.endSession();
    this.set("idle");
  }

  async say(text: string, voiceOverride?: string) {
    if (!text.trim()) return;
    this.set("speaking");
    const opts = this.profile.speechOptions();
    try {
      await this.tts.speak(text, { ...opts, voice: voiceOverride || opts.voice });
      if (this.session) this.session.reply = text;
    } finally {
      this.endSession();
      this.set("idle");
    }
  }

  private endSession() {
    if (!this.session) return;
    const session = { ...this.session, endedAt: Date.now() };
    this.session = null;
    if (!session.durationMs) session.durationMs = (session.endedAt ?? 0) - session.startedAt;
    this.hooks.onSessionEnd?.(session);
  }
}
