import { getDatabase } from "./Database";

export class KnowledgeEngine {
  private normalize(text: string) {
    return text
      .toLowerCase()
      .replace(/[؟?!.,،؛:]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  private words(text: string) {
    return this.normalize(text)
      .split(" ")
      .filter((w) => w.length > 2);
  }

  private similarity(query: string, item: any) {
    const qWords = this.words(query);

    const target = this.normalize(`${item.title} ${item.content} ${item.keywords || ""}`);

    const tWords = this.words(target);

    let score = 0;

    for (const q of qWords) {
      for (const t of tWords) {
        if (q === t) score += 5;
        else if (t.includes(q) || q.includes(t)) score += 2;
      }
    }

    // bonus للسؤال الموجود في العنوان
    if (this.normalize(item.title).includes(this.normalize(query))) {
      score += 10;
    }

    return score / Math.max(qWords.length, 1);
  }

  async search(query: string) {
    const db = await getDatabase();

    const stmt = db.prepare(`
      SELECT
      title,
      content,
      category,
      keywords
      FROM knowledge
    `);

    const results: any[] = [];

    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }

    stmt.free();

    return results
      .map((item) => ({
        ...item,
        score: this.similarity(query, item),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  async ask(query: string) {
    const results = await this.search(query);

    if (!results.length) return null;

    const best = results[0];

    // لا تقبل نتيجة ضعيفة
    if (best.score < 1) return null;

    return best.content;
  }

  async answer(query: string) {
    return this.ask(query);
  }
}
