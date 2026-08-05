import type { Skill } from "../../shared/types";

/** Keyless knowledge lookup used to ground answers before reasoning. */
export const SearchSkill: Skill = {
  id: "search",
  name: "البحث",
  description: "يبحث عن معلومة عامة ويعيد ملخصاً قصيراً",
  intents: ["search"],
  async execute({ intent }) {
    const query = intent.raw
      .replace(/ابحث\s*(عن|لي)?/i, "")
      .replace(/search( for)?/i, "")
      .trim();
    if (!query) return { ok: false, speech: "", error: "empty_query" };
    try {
      const res = await fetch(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
      );
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { AbstractText?: string; Heading?: string };
      if (!data.AbstractText) return { ok: false, speech: "", error: "no_result" };
      return { ok: true, speech: data.AbstractText.slice(0, 300), data: { query } };
    } catch (e) {
      return { ok: false, speech: "", error: String(e) };
    }
  },
};
