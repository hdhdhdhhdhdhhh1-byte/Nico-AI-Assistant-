import { beforeEach, describe, expect, it } from "vitest";
import { LocalVoiceCache } from "../LocalVoiceCache";
import { WakeWordManager, matchesWakeWord, stripWakeWord } from "../WakeWordManager";
import { VoiceProfile, DEFAULT_VOICE_PROFILE } from "../VoiceProfile";
import { VoiceActivityDetector } from "../VoiceActivityDetector";

describe("WakeWordManager", () => {
  it("detects Arabic and English wake phrases", () => {
    expect(matchesWakeWord("يا نيكو ذكرني بالاجتماع")).toBe("يا نيكو");
    expect(matchesWakeWord("Hey Nico, what time is it")).toBe("hey nico");
    expect(matchesWakeWord("ذكرني بالاجتماع")).toBeNull();
  });

  it("strips the wake phrase from the request", () => {
    expect(stripWakeWord("يا نيكو، ذكرني بالاجتماع")).toBe("ذكرني بالاجتماع");
    expect(stripWakeWord("hey nico what time is it")).toBe("what time is it");
    expect(stripWakeWord("ذكرني")).toBe("ذكرني");
  });

  it("fires listeners and returns the cleaned transcript", () => {
    const mgr = new WakeWordManager();
    const seen: string[] = [];
    mgr.onWake((p) => seen.push(p));
    expect(mgr.consumeTranscript("يا نيكو شغل الموسيقى")).toBe("شغل الموسيقى");
    expect(seen).toEqual(["يا نيكو"]);
    expect(mgr.consumeTranscript("شغل الموسيقى")).toBeNull();
  });

  it("stays disabled without a registered detector", async () => {
    const mgr = new WakeWordManager();
    expect(mgr.hasDetector).toBe(false);
    expect(await mgr.enable()).toBe(false);
    expect(mgr.enabled).toBe(false);
  });
});

describe("LocalVoiceCache", () => {
  let cache: LocalVoiceCache;
  beforeEach(() => {
    cache = new LocalVoiceCache();
    cache.clear();
  });

  it("answers deterministic offline commands", () => {
    const now = new Date(2026, 0, 2, 9, 5);
    expect(cache.resolveOffline("كم الساعة؟", now)).toBe("الساعة 9:05.");
    expect(cache.resolveOffline("شكرا", now)).toBe("العفو، دائماً في خدمتك.");
  });

  it("caches and normalizes repeated replies", () => {
    cache.put("  ما اسمي؟ ", "اسمك نيكو");
    expect(cache.get("ما اسمي")).toBe("اسمك نيكو");
    expect(cache.size()).toBe(1);
  });

  it("ignores empty replies and returns null for unknown utterances", () => {
    cache.put("سؤال", "   ");
    expect(cache.size()).toBe(0);
    expect(cache.resolveOffline("اشرح لي النسبية")).toBeNull();
  });
});

describe("VoiceProfile", () => {
  it("clamps speed and builds speech options", () => {
    const profile = new VoiceProfile();
    expect(profile.data.voiceId).toBe(DEFAULT_VOICE_PROFILE.voiceId);
    expect(profile.update({ speed: 5 }).speed).toBe(2);
    expect(profile.update({ speed: 0.1 }).speed).toBe(0.5);
    profile.update({ style: "calm", language: "ar", speed: 1.2, pitch: 0.8 });
    const opts = profile.speechOptions();
    expect(opts.speed).toBe(1.2);
    expect(opts.instructions).toContain("Speak slowly");
    expect(opts.instructions).toContain("lower, deeper pitch");
    expect(opts.instructions).toContain("Arabic");
  });
});

describe("VoiceActivityDetector", () => {
  it("ends the utterance after trailing silence", () => {
    const events: string[] = [];
    const vad = new VoiceActivityDetector({
      threshold: 0.05,
      silenceMs: 500,
      onSpeechStart: () => events.push("start"),
      onSpeechEnd: (r) => events.push(r),
    });
    let t = 0;
    vad.push(0.01, t);
    vad.push(0.3, (t += 100));
    expect(vad.hasSpeech).toBe(true);
    vad.push(0.01, (t += 300));
    expect(events).toEqual(["start"]);
    vad.push(0.01, (t += 400));
    expect(events).toEqual(["start", "silence"]);
    expect(vad.push(0.9, (t += 100))).toBe(false);
  });

  it("times out when nobody speaks", () => {
    const seen: string[] = [];
    const vad = new VoiceActivityDetector({
      startTimeoutMs: 1000,
      onSpeechEnd: (r) => seen.push(r),
    });
    vad.push(0, 0);
    vad.push(0, 1200);
    expect(seen).toEqual(["timeout"]);
    expect(vad.hasSpeech).toBe(false);
  });
});
