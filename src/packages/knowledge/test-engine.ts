import { KnowledgeEngine } from "./KnowledgeEngine";

async function test() {
  const engine = new KnowledgeEngine();

  const testQueries = [
    "ما هي مساحة اليمن؟",
    "اليمن وعاصمتها",
    "تعريف الذكاء الاصطناعي",
    "من هو نيكو؟",
    "مساعد شخصي محلي",
    "دولة في جنوب غرب آسيا",
    "الذكاء الإصطناعي", // اختبار الهمزة
  ];

  console.log("--- بدء اختبار محرك المعرفة المطور ---\n");

  for (const query of testQueries) {
    console.log(`السؤال: "${query}"`);
    const answer = await engine.ask(query);
    const results = await engine.search(query);

    if (results.length > 0) {
      console.log(`أفضل نتيجة: ${results[0].title} (الدرجة: ${results[0].score.toFixed(4)})`);
      console.log(`الإجابة: ${answer ? answer.substring(0, 50) + "..." : "لا توجد إجابة كافية"}`);
    } else {
      console.log("لا توجد نتائج.");
    }
    console.log("-----------------------------------\n");
  }
}

test().catch(console.error);
