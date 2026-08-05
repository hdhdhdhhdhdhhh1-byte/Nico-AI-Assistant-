import { getDatabase } from "./Database";

/**
 * محرك المعرفة المطور (KnowledgeEngine)
 * يدعم المعالجة المتقدمة للغة العربية وترتيب النتائج بناءً على TF-IDF والتشابه الجيبي.
 */

const STOP_WORDS = new Set([
  "من",
  "في",
  "على",
  "الى",
  "عن",
  "مع",
  "هذا",
  "هذه",
  "ذلك",
  "ما",
  "هل",
  "كيف",
  "لماذا",
  "اين",
  "متى",
  "كم",
  "هو",
  "هي",
  "هم",
  "كان",
  "كانت",
  "ان",
  "انها",
  "لقد",
  "قد",
  "تم",
  "التي",
  "الذي",
  "الذين",
  "ماذا",
  "يا",
  "ايها",
  "او",
  "ام",
  "بل",
  "لكن",
  "ثم",
  "فقط",
  "حتى",
  "عندما",
  "بينما",
  "حول",
  "قبل",
  "بعد",
  "كل",
  "بعض",
  "جميع",
  "نفس",
]);

export class ArabicNormalizer {
  /**
   * تطبيع النص العربي: إزالة التشكيل، توحيد الهمزات، والتاء المربوطة والياء.
   */
  static normalize(text: string): string {
    if (!text) return "";

    return (
      text
        .toLowerCase()
        // إزالة التشكيل
        .replace(/[\u064B-\u0652]/g, "")
        // توحيد الهمزات
        .replace(/[أإآ]/g, "ا")
        // توحيد التاء المربوطة
        .replace(/ة/g, "ه")
        // توحيد الياء
        .replace(/[ىي]/g, "ي")
        // إزالة علامات الترقيم
        .replace(/[؟?!.,،؛:()\[\]{}"'«»\-+*_]/g, " ")
        // إزالة المسافات الزائدة
        .replace(/\s+/g, " ")
        .trim()
    );
  }

  static tokenize(text: string): string[] {
    const normalized = this.normalize(text);
    return normalized.split(" ").filter((word) => word.length > 1 && !STOP_WORDS.has(word));
  }
}

interface SearchResult {
  id: number;
  title: string;
  content: string;
  category: string;
  keywords: string;
  importance_weight: number;
  score: number;
}

export class KnowledgeEngine {
  /**
   * حساب تشابه جيب التمام (Cosine Similarity) المبسط
   */
  private calculateCosineSimilarity(vec1: Map<string, number>, vec2: Map<string, number>): number {
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    const allWords = new Set([...vec1.keys(), ...vec2.keys()]);

    for (const word of allWords) {
      const val1 = vec1.get(word) || 0;
      const val2 = vec2.get(word) || 0;
      dotProduct += val1 * val2;
      magnitude1 += val1 * val1;
      magnitude2 += val2 * val2;
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) return 0;
    return dotProduct / (magnitude1 * magnitude2);
  }

  private createVector(tokens: string[]): Map<string, number> {
    const vector = new Map<string, number>();
    for (const token of tokens) {
      vector.set(token, (vector.get(token) || 0) + 1);
    }
    return vector;
  }

  /**
   * البحث الذكي في قاعدة المعرفة
   */
  async search(query: string): Promise<SearchResult[]> {
    const db = await getDatabase();
    const queryTokens = ArabicNormalizer.tokenize(query);
    const queryVector = this.createVector(queryTokens);

    if (queryTokens.length === 0) return [];

    // البحث الأولي باستخدام LIKE لتحسين الأداء بدلاً من تحميل كل البيانات
    // سنبحث في العنوان والكلمات المفتاحية والمحتوى
    const searchTerms = queryTokens.map((t) => `%${t}%`);
    const placeholders = searchTerms
      .map(() => "(title LIKE ? OR keywords LIKE ? OR content LIKE ?)")
      .join(" OR ");

    const params: any[] = [];
    searchTerms.forEach((t) => {
      params.push(t, t, t);
    });

    const stmt = db.prepare(`
      SELECT * FROM knowledge 
      WHERE ${placeholders}
    `);

    stmt.bind(params);

    const candidates: any[] = [];
    while (stmt.step()) {
      candidates.push(stmt.getAsObject());
    }
    stmt.free();

    // إذا لم نجد نتائج بالـ LIKE، نجرب تحميل عينة من البيانات (للحالات التي لا تدعم LIKE بشكل جيد)
    if (candidates.length === 0) {
      const fallbackStmt = db.prepare("SELECT * FROM knowledge LIMIT 100");
      while (fallbackStmt.step()) {
        candidates.push(fallbackStmt.getAsObject());
      }
      fallbackStmt.free();
    }

    const results: SearchResult[] = candidates.map((item) => {
      const titleTokens = ArabicNormalizer.tokenize(item.title || "");
      const contentTokens = ArabicNormalizer.tokenize(item.content || "");
      const keywordTokens = ArabicNormalizer.tokenize(item.keywords || "");

      const titleVector = this.createVector(titleTokens);
      const contentVector = this.createVector(contentTokens);
      const keywordVector = this.createVector(keywordTokens);

      // حساب الدرجات لمختلف الحقول
      const titleScore = this.calculateCosineSimilarity(queryVector, titleVector);
      const keywordScore = this.calculateCosineSimilarity(queryVector, keywordVector);
      const contentScore = this.calculateCosineSimilarity(queryVector, contentVector);

      // نظام الترتيب الموزون
      // العنوان: 50%، الكلمات المفتاحية: 30%، المحتوى: 20%
      let finalScore = titleScore * 0.5 + keywordScore * 0.3 + contentScore * 0.2;

      // ضرب النتيجة في وزن الأهمية (Importance Weight)
      finalScore *= item.importance_weight || 1.0;

      // علاوة إضافية إذا كان أحد كلمات السؤال موجوداً تماماً في العنوان
      const exactMatchBonus = queryTokens.some((qt) => titleTokens.includes(qt)) ? 0.1 : 0;
      finalScore += exactMatchBonus;

      return {
        ...item,
        score: finalScore,
      };
    });

    return results
      .filter((r) => r.score > 0.05) // حد أدنى للقبول
      .sort((a, b) => b.score - a.score);
  }

  /**
   * الحصول على أفضل إجابة للسؤال
   */
  async ask(query: string): Promise<string | null> {
    console.log(`[KnowledgeEngine] Processing query: "${query}"`);

    const results = await this.search(query);

    if (results.length === 0) {
      console.log("[KnowledgeEngine] No matches found.");
      return null;
    }

    const best = results[0];
    console.log(
      `[KnowledgeEngine] Best match: "${best.title}" with score: ${best.score.toFixed(4)}`,
    );

    // إذا كانت النتيجة ضعيفة جداً، نعتبر أننا لا نعرف الإجابة
    if (best.score < 0.15) {
      console.log("[KnowledgeEngine] Best match score below threshold.");
      return null;
    }

    return best.content;
  }

  async answer(query: string): Promise<string | null> {
    return this.ask(query);
  }
}
