export interface SpeakOptions {
  voice?: string;
  speed?: number;
  instructions?: string;
}

export class TextToSpeech {
  private ctx: AudioContext | null = null;
  private sources = new Set<AudioBufferSourceNode>();
  private analyser: AnalyserNode | null = null;

  constructor(private readonly endpoint = "/api/nico/speak") {}

  level(): number {
    if (!this.analyser) return 0;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(data);
    let peak = 0;
    for (const v of data) {
      peak = Math.max(peak, Math.abs(v - 128) / 128);
    }
    return peak;
  }

  async speak(text: string, options: string | SpeakOptions = {}): Promise<void> {
    const opts: SpeakOptions = typeof options === "string" ? { voice: options } : options;
    if (!text.trim()) return;

    this.stop();

    // Try native TTS first if on mobile and offline, or as a general fallback
    let isNative = false;
    if (typeof window !== "undefined") {
      const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
        .Capacitor;
      isNative = Boolean(cap?.isNativePlatform?.());
    }

    if (isNative && (!navigator.onLine || opts.voice === "local")) {
      try {
        const { TextToSpeech: NativeTTS } = await import("@capacitor-community/text-to-speech");
        await NativeTTS.speak({
          text,
          lang: opts.voice === "ar" ? "ar-SA" : "en-US",
          rate: opts.speed ?? 1.0,
          pitch: 1.0,
          volume: 1.0,
          category: "ambient",
        });
        return;
      } catch (e) {
        console.warn("Native TTS failed, trying web fallback", e);
      }
    }

    // Web-based TTS (Cloud)
    const ctx = new AudioContext();
    this.ctx = ctx;
    if (ctx.state === "suspended") {
      await ctx.resume().catch(() => {});
    }
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.connect(ctx.destination);
    this.analyser = analyser;

    try {
      const res = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          voice: opts.voice ?? "ar",
          speed: opts.speed,
          instructions: opts.instructions,
        }),
      });

      if (!res.ok) {
        throw new Error("TTS Cloud failed");
      }

      const type = res.headers.get("content-type") || "";

      if (type.includes("audio/wav") || type.includes("audio/x-wav")) {
        const arrayBuffer = await res.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(analyser);
        this.sources.add(source);
        source.onended = () => {
          this.sources.delete(source);
        };
        source.start();
        await new Promise<void>((resolve) => {
          source.onended = () => {
            this.sources.delete(source);
            resolve();
          };
        });
        return;
      }

      // Fallback to Web Speech API if fetch fails and we're in browser
      if (!isNative && !navigator.onLine) {
        this.speakWebSpeech(text, opts);
      }
    } catch (e) {
      console.error("TTS Fetch Error, falling back to Web Speech API", e);
      this.speakWebSpeech(text, opts);
    }
  }

  private speakWebSpeech(text: string, opts: SpeakOptions) {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = opts.voice === "ar" ? "ar-SA" : "en-US";
      utterance.rate = opts.speed ?? 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }

  stop() {
    this.sources.forEach((s) => {
      try {
        s.stop();
      } catch {
        // ignore
      }
    });
    this.sources.clear();
    this.analyser = null;
    this.ctx?.close().catch(() => {});
    this.ctx = null;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }
}
