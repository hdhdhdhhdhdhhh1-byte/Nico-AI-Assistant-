import { VoiceActivityDetector, VadOptions } from "./VoiceActivityDetector";

export interface TranscriptionResult {
  text: string;
  language: string;
  durationMs: number;
  confidence?: number;
}

export interface SttHandle {
  hasSpeech: () => boolean;
  /** `hint` biases detection towards the user's preferred language. */
  stop: (hint?: string) => Promise<TranscriptionResult>;
  cancel: () => void;
  level: () => number;
}

export interface SttStartOptions {
  /** Enable automatic stop on trailing silence. */
  vad?: VadOptions | false;
  /** Called when the detector decides the utterance is complete. */
  onAutoStop?: (reason: "silence" | "timeout") => void;
  onSpeechStart?: () => void;
}

export class SpeechToText {
  constructor(private readonly endpoint = "/api/nico/transcribe") {}

  async start(options: SttStartOptions = {}): Promise<SttHandle> {
    // Check if we are on a native platform and have SpeechRecognition available
    let isNative = false;
    if (typeof window !== "undefined") {
      const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
        .Capacitor;
      isNative = Boolean(cap?.isNativePlatform?.());
    }

    if (isNative) {
      try {
        const { SpeechRecognition } = await import("@capacitor-community/speech-recognition");
        const available = await SpeechRecognition.available();
        if (available.available) {
          return this.startNative(options);
        }
      } catch (e) {
        console.warn("Native SpeechRecognition not available, falling back to Web STT", e);
      }
    }

    return this.startWeb(options);
  }

  private async startNative(_options: SttStartOptions): Promise<SttHandle> {
    const startedAt = Date.now();
    let transcript = "";

    const { SpeechRecognition } = await import("@capacitor-community/speech-recognition");

    const { hasPermission } = await SpeechRecognition.hasPermission();
    if (!hasPermission) {
      await SpeechRecognition.requestPermission();
    }

    SpeechRecognition.start({
      language: "ar-SA",
      maxResults: 1,
      prompt: "تحدث الآن...",
      partialResults: true,
      popup: false,
    });

    SpeechRecognition.addListener("partialResults", (data: { matches?: string[] }) => {
      if (data.matches && data.matches.length > 0) {
        transcript = data.matches[0];
      }
    });

    return {
      level: () => 0.5,
      hasSpeech: () => true,
      cancel: async () => {
        await SpeechRecognition.stop();
      },
      stop: async (hint?: string) => {
        await SpeechRecognition.stop();
        return {
          text: transcript,
          language: hint ?? "ar",
          durationMs: Date.now() - startedAt,
        };
      },
    };
  }

  private async startWeb(options: SttStartOptions = {}): Promise<SttHandle> {
    const startedAt = Date.now();
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    const chunks: Float32Array[] = [];
    let stopped = false;
    processor.onaudioprocess = (e) => {
      if (stopped) return;
      chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    };
    source.connect(analyser);
    source.connect(processor);
    processor.connect(ctx.destination);
    const levelData = new Uint8Array(analyser.frequencyBinCount);
    const readLevel = () => {
      analyser.getByteTimeDomainData(levelData);
      let peak = 0;
      for (const v of levelData) peak = Math.max(peak, Math.abs(v - 128) / 128);
      return peak;
    };

    let vad: VoiceActivityDetector | null = null;
    if (options.vad !== false) {
      vad = new VoiceActivityDetector({
        ...(options.vad ?? {}),
        onSpeechStart: options.onSpeechStart,
        onSpeechEnd: (reason) => options.onAutoStop?.(reason),
      });
      vad.attach(readLevel);
    }
    const teardown = async () => {
      stopped = true;
      vad?.stop();
      processor.disconnect();
      analyser.disconnect();
      source.disconnect();
      stream.getTracks().forEach((t) => t.stop());
      const rate = ctx.sampleRate;
      await ctx.close();
      return rate;
    };
    return {
      level: readLevel,
      hasSpeech: () => vad?.hasSpeech ?? true,
      cancel: () => void teardown(),
      stop: async (hint?: string) => {
        const durationMs = Date.now() - startedAt;
        const rate = await teardown();
        const wav = encodeWav(chunks, rate);
        if (wav.size < 2048) throw new Error("empty_recording");

        if (!navigator.onLine) {
          // Try browser Web Speech Recognition if available
          if (typeof window !== "undefined") {
            const win = window as unknown as Record<string, unknown>;
            const SpeechRec = (win.SpeechRecognition || win.webkitSpeechRecognition) as
              | (new () => {
                  lang: string;
                  interimResults: boolean;
                  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
                  onerror: () => void;
                  onend: () => void;
                  start: () => void;
                })
              | undefined;
            if (SpeechRec) {
              return new Promise<TranscriptionResult>((resolve) => {
                const rec = new SpeechRec();
                rec.lang = hint || "ar-SA";
                rec.interimResults = false;
                rec.onresult = (e) => {
                  const text = e.results[0]?.[0]?.transcript || "";
                  resolve({ text, language: hint ?? "ar", durationMs });
                };
                rec.onerror = () => resolve({ text: "", language: hint ?? "ar", durationMs });
                rec.onend = () => resolve({ text: "", language: hint ?? "ar", durationMs });
                rec.start();
              });
            }
          }
          return { text: "", language: hint ?? "ar", durationMs };
        }

        const form = new FormData();
        form.append("audio", wav, "recording.wav");
        if (hint) form.append("language", hint);
        form.append("duration_ms", String(durationMs));

        try {
          const res = await fetch(this.endpoint, { method: "POST", body: form });
          if (!res.ok) {
            const detail = await res.text().catch(() => "");
            throw new Error(`Transcription failed [${res.status}]: ${detail}`);
          }
          const data = (await res.json()) as {
            text?: string;
            language?: string;
            confidence?: number;
          };
          return {
            text: (data.text ?? "").trim(),
            language: data.language ?? hint ?? "ar",
            durationMs,
            confidence: data.confidence,
          } satisfies TranscriptionResult;
        } catch (e) {
          console.error("Web STT Fetch Error", e);
          throw new Error("offline_no_stt");
        }
      },
    };
  }
}

export function encodeWav(chunks: Float32Array[], sampleRate: number, target = 16000): Blob {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const merged = new Float32Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }
  const ratio = sampleRate / target;
  const outLength = Math.floor(merged.length / ratio);
  const samples = new Int16Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const s = Math.max(-1, Math.min(1, merged[Math.floor(i * ratio)] ?? 0));
    samples[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (pos: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(pos + i, str.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, target, true);
  view.setUint32(28, target * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);
  new Int16Array(buffer, 44).set(samples);
  return new Blob([buffer], { type: "audio/wav" });
}
