import { getDatabase, saveDatabase } from "./Database";

async function seed() {
  const db = await getDatabase();

  const data = [
    {
      title: "اليمن",
      content:
        "اليمن دولة عربية تقع في جنوب غرب آسيا. عاصمتها صنعاء. مساحتها حوالي 527968 كيلومتر مربع.",
      category: "جغرافيا",
      keywords: "اليمن صنعاء عدن مساحة",
    },

    {
      title: "الذكاء الاصطناعي",
      content:
        "الذكاء الاصطناعي هو مجال من علوم الحاسوب يهدف إلى إنشاء أنظمة قادرة على التعلم والتحليل واتخاذ القرارات.",
      category: "تقنية",
      keywords: "AI ذكاء اصطناعي تعلم",
    },

    {
      title: "نيكو",
      content: "نيكو هو مساعد شخصي ذكي يعمل محليا ويمكنه التعلم وحفظ المعلومات وتنفيذ المهام.",
      category: "مساعد",
      keywords: "Nico مساعد صوتي",
    },
  ];

  const stmt = db.prepare(`
 INSERT INTO knowledge
 (title,content,category,keywords)
 VALUES (?,?,?,?)
 `);

  for (const item of data) {
    stmt.run([item.title, item.content, item.category, item.keywords]);
  }

  stmt.free();

  saveDatabase();

  console.log("Nico knowledge database ready");
}

seed();
