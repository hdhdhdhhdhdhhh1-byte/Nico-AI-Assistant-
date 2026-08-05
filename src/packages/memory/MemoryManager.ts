import type { ConversationTurn, MemoryRecord } from "../shared/types";
import { LongTermMemory } from "./LongTermMemory";
import { ShortTermMemory } from "./ShortTermMemory";
import { UserProfile } from "./UserProfile";
import { MemoryIntelligence, type MemoryAnalysis } from "./MemoryIntelligence";
import { memoryRanking, type RankedMemory } from "./MemoryRanking";

export interface PendingMemory {
  id: string;
  analysis: MemoryAnalysis;
  createdAt: number;
}

/**
 * Decides WHAT is stored, WHERE it lives, and WHEN it is recalled.
 * Uses MemoryIntelligence to filter what deserves long-term storage
 * and to gate on user confirmation when needed.
 */
export class MemoryManager {
  readonly shortTerm: ShortTermMemory;
  readonly longTerm: LongTermMemory;
  readonly profile: UserProfile;
  readonly intelligence = new MemoryIntelligence();
  readonly ranking = memoryRanking;
  private pending: PendingMemory[] = [];
  private summaryLines: string[] = [];

  constructor(profile = new UserProfile()) {
    this.profile = profile;
    this.shortTerm = new ShortTermMemory();
    this.longTerm = new LongTermMemory(!profile.data.isGuest);
  }

  observe(turn: ConversationTurn) {
    this.shortTerm.push(turn);
  }

  /**
   * Analyze a raw user utterance and either store, queue for confirmation,
   * or ignore it. Returns the resulting analysis for the pipeline.
   */
  ingest(utterance: string): {
    analysis: MemoryAnalysis;
    stored?: MemoryRecord;
    pending?: PendingMemory;
  } {
    const analysis = this.intelligence.analyze(utterance);
    if (analysis.profilePatch) this.profile.update(analysis.profilePatch);
    if (!analysis.shouldConsider || !analysis.suggestion) return { analysis };

    if (analysis.needsConfirmation) {
      const pending: PendingMemory = {
        id: crypto.randomUUID(),
        analysis,
        createdAt: Date.now(),
      };
      this.pending.push(pending);
      return { analysis, pending };
    }
    const stored = this.remember({
      key: analysis.suggestion.key,
      value: analysis.suggestion.value,
      kind: analysis.suggestion.kind,
      importance: analysis.importance,
      retention: analysis.retention,
    });
    return { analysis, stored: stored ?? undefined };
  }

  pendingMemories(): PendingMemory[] {
    return [...this.pending];
  }

  confirmPending(id: string): MemoryRecord | null {
    const idx = this.pending.findIndex((p) => p.id === id);
    if (idx < 0) return null;
    const [p] = this.pending.splice(idx, 1);
    if (!p.analysis.suggestion) return null;
    return this.remember({
      key: p.analysis.suggestion.key,
      value: p.analysis.suggestion.value,
      kind: p.analysis.suggestion.kind,
      importance: p.analysis.importance,
      retention: p.analysis.retention,
    });
  }

  rejectPending(id: string): boolean {
    const before = this.pending.length;
    this.pending = this.pending.filter((p) => p.id !== id);
    return this.pending.length !== before;
  }

  remember(record: Omit<MemoryRecord, "id" | "createdAt" | "score">) {
    if (this.profile.data.isGuest && record.kind !== "profile") {
      this.shortTerm.setSlot(record.key, record.value);
      return null;
    }
    return this.longTerm.write({
      ...record,
      importance: record.importance ?? this.ranking.score(record.value, record.kind),
    });
  }

  recall(query: string): MemoryRecord[] {
    return this.longTerm.search(query);
  }

  /** Memories ordered by importance × reinforcement × recency. */
  ranked(limit = 10): RankedMemory[] {
    return this.ranking.top(this.longTerm.all(), limit);
  }

  /**
   * Memory compression — drops duplicates, expired and stale low-value
   * records. Returns how many were removed.
   */
  compress(): number {
    const { drop } = this.ranking.compress(this.longTerm.all());
    drop.forEach((id) => this.longTerm.forget(id));
    return drop.length;
  }

  /**
   * Summarizes the current short-term conversation into durable lines and
   * keeps them as the running memory summary.
   */
  summarizeSession(maxLines = 5): string[] {
    const lines = this.ranking.summarize(this.shortTerm.history(), maxLines);
    if (lines.length) this.summaryLines = lines;
    return lines;
  }

  /** Short human summary of what Nico durably knows. */
  summary(): string[] {
    const top = this.ranked(5).map((r) => `${r.key}: ${r.value}`);
    return [...top, ...this.summaryLines];
  }

  /** List everything Nico remembers about the user (profile + LTM). */
  describeAll(): string[] {
    const p = this.profile.data;
    const lines: string[] = [];
    if (p.name) lines.push(`اسمك ${p.name}`);
    if (p.preferredName && p.preferredName !== p.name)
      lines.push(`تحب أن أناديك ${p.preferredName}`);
    if (p.interests.length) lines.push(`اهتماماتك: ${p.interests.join("، ")}`);
    for (const [k, v] of Object.entries(p.preferences)) lines.push(`${k}: ${v}`);
    for (const d of p.importantDates) lines.push(`${d.label}: ${d.date}`);
    for (const r of this.longTerm.all().slice(0, 10)) lines.push(`- ${r.value}`);
    return lines;
  }

  /** Forget memory records matching a query. Returns count removed. */
  forget(query: string): number {
    const targets = this.longTerm.search(query, 20);
    for (const t of targets) this.longTerm.forget(t.id);
    return targets.length;
  }

  digest(): string {
    const p = this.profile.data;
    const lines = this.ranked(12).map((r) => `- ${r.key}: ${r.value}`);
    if (p.name) lines.unshift(`- الاسم: ${p.name}`);
    if (p.preferredName) lines.unshift(`- ينادى بـ: ${p.preferredName}`);
    if (p.interests.length) lines.unshift(`- اهتمامات: ${p.interests.join("، ")}`);
    if (p.communicationStyle) lines.unshift(`- أسلوب مفضّل: ${p.communicationStyle}`);
    return lines.join("\n");
  }

  forgetAll() {
    this.shortTerm.clear();
    this.longTerm.clear();
    this.pending = [];
  }
}
