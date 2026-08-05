export interface Note {
  id: string;
  text: string;
  createdAt: number;
  source: "voice" | "text";
}

const KEY = "nico.notes.v1";

/**
 * Local-first note storage. Signed-in users mirror notes into the cloud
 * memory table through MemoryManager; guests keep them on-device only.
 */
export class NotesStore {
  private notes: Note[] = [];
  private listeners = new Set<(notes: Note[]) => void>();

  constructor() {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) this.notes = JSON.parse(raw) as Note[];
    } catch {
      this.notes = [];
    }
  }

  private persist() {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(this.notes));
    } catch {
      /* quota */
    }
    const snapshot = this.all();
    this.listeners.forEach((l) => l(snapshot));
  }

  add(text: string, source: Note["source"] = "voice"): Note {
    const note: Note = {
      id: crypto.randomUUID(),
      text: text.trim(),
      createdAt: Date.now(),
      source,
    };
    this.notes.unshift(note);
    this.persist();
    return note;
  }

  all(): Note[] {
    return [...this.notes];
  }

  search(query: string, limit = 5): Note[] {
    const tokens = query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2);
    if (!tokens.length) return this.all().slice(0, limit);
    return this.notes
      .map((n) => ({ n, hits: tokens.filter((t) => n.text.toLowerCase().includes(t)).length }))
      .filter((x) => x.hits > 0)
      .sort((a, b) => b.hits - a.hits)
      .slice(0, limit)
      .map((x) => x.n);
  }

  remove(id: string) {
    this.notes = this.notes.filter((n) => n.id !== id);
    this.persist();
  }

  removeMatching(query: string): number {
    const targets = this.search(query, 20);
    const ids = new Set(targets.map((t) => t.id));
    this.notes = this.notes.filter((n) => !ids.has(n.id));
    this.persist();
    return ids.size;
  }

  clear() {
    this.notes = [];
    this.persist();
  }

  subscribe(fn: (notes: Note[]) => void) {
    this.listeners.add(fn);
    fn(this.all());
    return () => this.listeners.delete(fn);
  }
}

export const notesStore = new NotesStore();
