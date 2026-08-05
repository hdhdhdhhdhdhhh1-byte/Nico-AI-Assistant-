import type { MemoryRecord } from "../shared/types";

const DB_NAME = "NicoOfflineDB";
const STORE_NAME = "memories";

export class LongTermMemory {
  private records: MemoryRecord[] = [];
  private db: IDBDatabase | null = null;

  constructor(private readonly persistent = true) {
    if (typeof window !== "undefined") {
      this.initDB().then(() => this.load());
    }
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };
      request.onerror = () => reject(new Error("Failed to open IndexedDB"));
    });
  }

  private async load() {
    if (!this.db) return;
    const transaction = this.db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      this.records = request.result as MemoryRecord[];
    };
  }

  private async saveRecord(record: MemoryRecord) {
    if (!this.db) return;
    const transaction = this.db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.put(record);
  }

  all(): MemoryRecord[] {
    return [...this.records].sort((a, b) => b.score - a.score);
  }

  write(record: Omit<MemoryRecord, "id" | "createdAt" | "score">): MemoryRecord {
    const existing = this.records.find((r) => r.key === record.key);
    if (existing) {
      existing.value = record.value;
      existing.score += 1;
      this.saveRecord(existing);
      return existing;
    }
    const created: MemoryRecord = {
      ...record,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      score: 1,
    };
    this.records.push(created);
    this.saveRecord(created);
    return created;
  }

  search(query: string, limit = 5): MemoryRecord[] {
    const q = query.toLowerCase();
    // Improved search for Arabic and short words
    const tokens = q.split(/\s+/).filter((t) => t.length >= 2);
    if (tokens.length === 0) return [];

    return this.records
      .map((r) => {
        const hay = (r.key + " " + r.value).toLowerCase();
        let hits = 0;
        for (const token of tokens) {
          if (hay.includes(token)) hits++;
        }
        return { r, hits };
      })
      .filter((x) => x.hits > 0)
      .sort((a, b) => b.hits - a.hits || b.r.score - a.r.score)
      .slice(0, limit)
      .map((x) => x.r);
  }

  async forget(id: string) {
    this.records = this.records.filter((r) => r.id !== id);
    if (this.db) {
      const transaction = this.db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      store.delete(id);
    }
  }

  async clear() {
    this.records = [];
    if (this.db) {
      const transaction = this.db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      store.clear();
    }
  }
}
