import type { Skill } from "../../shared/types";
import { notesStore } from "../../notes/NotesStore";

const DELETE_RE = /(احذف|امسح|delete|remove)/i;
const SEARCH_RE = /(ابحث|دور|اعرض|شو|ما هي|find|show|list)/i;

/** Voice notes: create, search and delete — fully on-device. */
export const NotesSkill: Skill = {
  id: "notes",
  name: "الملاحظات",
  description: "ينشئ ملاحظات صوتية ويبحث فيها ويحذفها",
  intents: ["notes"],
  async execute({ intent }) {
    const raw = intent.raw.trim();
    const body = raw
      .replace(/(ملاحظة|ملاحظاتي|الملاحظات|note[s]?)/gi, " ")
      .replace(DELETE_RE, " ")
      .replace(SEARCH_RE, " ")
      .replace(/^\s*(سجل|اكتب|أضف|اضف|add|save)\s*/i, "")
      .trim();

    if (DELETE_RE.test(raw)) {
      if (!body) {
        const count = notesStore.all().length;
        notesStore.clear();
        return { ok: true, speech: `حذفت ${count} ملاحظة.`, data: { removed: count } };
      }
      const removed = notesStore.removeMatching(body);
      return removed
        ? { ok: true, speech: `حذفت ${removed} ملاحظة عن "${body}".`, data: { removed } }
        : { ok: false, speech: "", error: "no_match" };
    }

    if (SEARCH_RE.test(raw) || !body) {
      const hits = body ? notesStore.search(body) : notesStore.all().slice(0, 5);
      if (!hits.length) return { ok: false, speech: "", error: "no_notes" };
      return {
        ok: true,
        speech: `عندك ${hits.length} ملاحظة: ` + hits.map((n) => n.text).join("، ") + ".",
        data: { count: hits.length },
      };
    }

    const note = notesStore.add(body, "voice");
    return { ok: true, speech: `سجّلت الملاحظة: ${note.text}.`, data: { id: note.id } };
  },
};
