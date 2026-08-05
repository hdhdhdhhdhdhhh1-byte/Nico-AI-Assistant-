import type { ConversationTurn, MemoryImportance, MemoryRecord } from "../shared/types";

const IMPORTANCE_WEIGHT: Record<MemoryImportance, number> = { low: 1, medium: 2.5, high: 5 };
const DAY = 86_400_000;

export interface RankedMemory extends MemoryRecord {
  rank: number;
}

/**
 * Memory Ranking & Compression.
 *
 * Ranking  — importance × reinforcement × recency decay.
 * Scoring  — turns raw text into an importance grade.
 * Compress — collapses duplicates/low-value records.
 * Summary  — turns a long conversation into a few durable lines.
 */
export class MemoryRanking {
  /** Score a candidate memory before it is written. */
  score(value: string, kind: MemoryRecord["kind"]): MemoryImportance {
    if (kind === "profile") return "high";
    const text = value.trim();
    if (/(عيد ميلاد|زوجت|زوجي|ابني|ابنتي|حساسية|دوائي|عملي|وظيفتي|birthday|allergy)/i.test(text))
      return "high";
    if (kind === "preference" || kind === "habit") return "medium";
    if (text.length < 12) return "low";
    return "medium";
  }

  rank(records: MemoryRecord[], now = Date.now()): RankedMemory[] {
    return records
      .map((r) => {
        const ageDays = Math.max(0, (now - r.createdAt) / DAY);
        const recency = 1 / (1 + ageDays / 30);
        const importance = IMPORTANCE_WEIGHT[r.importance ?? "medium"];
        const permanence = r.retention === "permanent" ? 1.5 : r.retention === "long" ? 1.2 : 1;
        const rank = importance * permanence * (1 + Math.log1p(r.score)) * (0.4 + 0.6 * recency);
        return { ...r, rank: Number(rank.toFixed(3)) };
      })
      .sort((a, b) => b.rank - a.rank);
  }

  top(records: MemoryRecord[], limit = 10): RankedMemory[] {
    return this.rank(records).slice(0, limit);
  }

  /**
   * Returns the ids that should be dropped: duplicates by key, expired
   * records, and low-importance short-retention records older than 30 days.
   */
  compress(records: MemoryRecord[], now = Date.now()): { keep: MemoryRecord[]; drop: string[] } {
    const seen = new Set<string>();
    const keep: MemoryRecord[] = [];
    const drop: string[] = [];
    for (const r of this.rank(records, now)) {
      const dupKey = `${r.kind}:${r.key.toLowerCase()}`;
      const expired = r.expiresAt ? r.expiresAt < now : false;
      const stale =
        (r.importance ?? "medium") === "low" &&
        r.retention !== "permanent" &&
        now - r.createdAt > 30 * DAY;
      if (seen.has(dupKey) || expired || stale) {
        drop.push(r.id);
        continue;
      }
      seen.add(dupKey);
      const { rank: _rank, ...rest } = r;
      keep.push(rest);
    }
    return { keep, drop };
  }

  /** Compresses a long conversation into a handful of durable lines. */
  summarize(turns: ConversationTurn[], maxLines = 5): string[] {
    const userLines = turns
      .filter((t) => t.role === "user" && t.content.trim().length > 8)
      .map((t) => t.content.trim());
    if (!userLines.length) return [];
    const scored = userLines
      .map((line) => ({
        line,
        weight:
          (/(اسمي|أحب|احب|أكره|اكره|أفضل|افضل|عملي|أهتم|هوايتي|my name|i like|i prefer)/i.test(line)
            ? 3
            : 1) + Math.min(2, line.length / 80),
      }))
      .sort((a, b) => b.weight - a.weight);
    const unique: string[] = [];
    for (const s of scored) {
      if (unique.some((u) => u.slice(0, 24) === s.line.slice(0, 24))) continue;
      unique.push(s.line.length > 140 ? `${s.line.slice(0, 140)}…` : s.line);
      if (unique.length >= maxLines) break;
    }
    return unique;
  }
}

export const memoryRanking = new MemoryRanking();
