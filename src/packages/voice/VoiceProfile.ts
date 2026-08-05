/**
 * VoiceProfile — how Nico sounds. Persisted locally for guests and mirrored to
 * `voice_preferences` in the cloud for signed-in users.
 *
 * Shape is intentionally provider-agnostic (voiceId / language / speed / pitch /
 * style) so future work can swap the TTS backend, ship multiple Nico voices, or
 * let a user register a personal cloned voice without touching callers.
 */
export type VoiceStyle = "friendly" | "calm" | "energetic" | "formal";

export interface VoiceProfileData {
  /** Provider voice identifier (or a future custom/cloned voice id). */
  voiceId: string;
  language: "ar" | "en";
  /** 0.5 – 2.0 playback rate. */
  speed: number;
  /** 0.5 – 2.0 relative pitch; applied through voice instructions today. */
  pitch: number;
  style: VoiceStyle;
}

const KEY = "nico.voice.profile.v2";
const LEGACY_KEY = "nico.voice.profile.v1";

export const DEFAULT_VOICE_PROFILE: VoiceProfileData = {
  voiceId: "alloy",
  language: "ar",
  speed: 1,
  pitch: 1,
  style: "friendly",
};

/** Voices exposed in the UI. Swappable without touching the pipeline. */
export const VOICE_OPTIONS: { id: string; label: string }[] = [
  { id: "alloy", label: "ألوي — محايد ودافئ" },
  { id: "verse", label: "فيرس — تعبيري" },
  { id: "sage", label: "سيج — هادئ" },
  { id: "ballad", label: "بالاد — ناعم" },
  { id: "coral", label: "كورال — حيوي" },
];

const STYLE_INSTRUCTIONS: Record<VoiceStyle, string> = {
  friendly: "Speak warmly and naturally, like a close friend who is happy to help.",
  calm: "Speak slowly, softly and reassuringly.",
  energetic: "Speak with upbeat energy and a lively rhythm.",
  formal: "Speak clearly and professionally, with measured pacing.",
};

function pitchInstruction(pitch: number): string {
  if (pitch >= 1.15) return " Use a noticeably higher, brighter pitch.";
  if (pitch <= 0.85) return " Use a lower, deeper pitch.";
  return "";
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export class VoiceProfile {
  data: VoiceProfileData;

  constructor(seed?: Partial<VoiceProfileData>) {
    this.data = { ...DEFAULT_VOICE_PROFILE, ...seed };
    this.load();
  }

  private load() {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        this.data = { ...this.data, ...(JSON.parse(raw) as Partial<VoiceProfileData>) };
        return;
      }
      // Migrate the Phase-6 shape (voiceName / tone) if present.
      const legacy = window.localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        const old = JSON.parse(legacy) as {
          voiceName?: string;
          tone?: VoiceStyle;
          speed?: number;
          language?: "ar" | "en";
        };
        this.data = {
          ...this.data,
          voiceId: old.voiceName ?? this.data.voiceId,
          style: old.tone ?? this.data.style,
          speed: old.speed ?? this.data.speed,
          language: old.language ?? this.data.language,
        };
      }
    } catch {
      /* ignore corrupt storage */
    }
  }

  private persist() {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* storage full or blocked */
    }
  }

  update(patch: Partial<VoiceProfileData>): VoiceProfileData {
    this.data = { ...this.data, ...patch };
    this.data.speed = clamp(this.data.speed, 0.5, 2);
    this.data.pitch = clamp(this.data.pitch, 0.5, 2);
    this.persist();
    return this.data;
  }

  /** Body fields for the /api/nico/speak route. */
  speechOptions() {
    return {
      voice: this.data.voiceId,
      speed: this.data.speed,
      instructions:
        STYLE_INSTRUCTIONS[this.data.style] +
        pitchInstruction(this.data.pitch) +
        (this.data.language === "ar" ? " Respond in natural spoken Arabic." : ""),
    };
  }
}
