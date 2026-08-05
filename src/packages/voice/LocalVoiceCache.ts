/**
 * LocalVoiceCache — offline preparation layer.
 *
 * Two jobs:
 *  1. Cache synthesized replies for repeated phrases so Nico can answer
 *     instantly (and cheaply) without hitting the TTS endpoint.
 *  2. Hold a small table of offline-answerable commands so simple requests
 *     keep working when the network is gone.
 *
 * Storage is localStorage-backed and capped; audio bytes are intentionally
 * NOT stored yet — only the resolved text — so the cache stays small.
 */
export interface CachedReply {
  key: string;
  reply: string;
  createdAt: number;
  hits: number;
}

const KEY = "nico.voice.cache.v1";
const MAX_ENTRIES = 60;

/** Deterministic offline answers. Matched before any network call. */
const OFFLINE_COMMANDS: { test: RegExp; reply: (now: Date) => string }[] = [
  {
    test: /^(كم الساعة|الساعة كم|what time is it)(?![\p{L}\p{N}])/iu,
    reply: (now) => `الساعة ${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}.`,
  },
  {
    test: /^(ما تاريخ اليوم|اليوم كم|what'?s the date)(?![\p{L}\p{N}])/iu,
    reply: (now) => `اليوم ${now.toLocaleDateString("ar")}.`,
  },
  { test: /^(توقف|اسكت|stop|be quiet)(?![\p{L}\p{N}])/iu, reply: () => "" },
  {
    test: /^(شكرا|شكراً|thanks|thank you)(?![\p{L}\p{N}])/iu,
    reply: () => "العفو، دائماً في خدمتك.",
  },
];

export class LocalVoiceCache {
  private entries = new Map<string, CachedReply>();

  constructor() {
    this.load();
  }

  private load() {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return;
      for (const e of JSON.parse(raw) as CachedReply[]) this.entries.set(e.key, e);
    } catch {
      /* ignore */
    }
  }

  private persist() {
    if (typeof window === "undefined") return;
    try {
      const list = [...this.entries.values()]
        .sort((a, b) => b.hits - a.hits || b.createdAt - a.createdAt)
        .slice(0, MAX_ENTRIES);
      this.entries = new Map(list.map((e) => [e.key, e]));
      window.localStorage.setItem(KEY, JSON.stringify(list));
    } catch {
      /* ignore */
    }
  }

  private static normalize(text: string) {
    return text
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[.،؟?!]+$/g, "");
  }

  /** True when the device currently has no connectivity. */
  static isOffline() {
    return typeof navigator !== "undefined" && navigator.onLine === false;
  }

  /** Answer a command locally, or null when it needs the full brain. */
  resolveOffline(utterance: string, now = new Date()): string | null {
    const text = LocalVoiceCache.normalize(utterance);
    for (const cmd of OFFLINE_COMMANDS) if (cmd.test.test(text)) return cmd.reply(now);
    return this.get(utterance);
  }

  get(utterance: string): string | null {
    const hit = this.entries.get(LocalVoiceCache.normalize(utterance));
    if (!hit) return null;
    hit.hits++;
    this.persist();
    return hit.reply;
  }

  put(utterance: string, reply: string) {
    if (!reply.trim()) return;
    const key = LocalVoiceCache.normalize(utterance);
    const existing = this.entries.get(key);
    this.entries.set(key, {
      key,
      reply,
      createdAt: Date.now(),
      hits: existing ? existing.hits + 1 : 1,
    });
    this.persist();
  }

  size() {
    return this.entries.size;
  }

  clear() {
    this.entries.clear();
    this.persist();
  }
}
