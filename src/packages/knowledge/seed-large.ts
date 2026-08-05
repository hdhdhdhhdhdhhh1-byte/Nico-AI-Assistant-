import { getDatabase, saveDatabase } from "./Database";

const data = [
  {
    title: "اليمن",
    category: "جغرافيا",
    keywords: "اليمن صنعاء عدن دولة عربية",
    content:
      "اليمن دولة عربية تقع في جنوب غرب آسيا، عاصمتها صنعاء، وتطل على البحر الأحمر وخليج عدن.",
  },

  {
    title: "الذكاء الاصطناعي",
    category: "تقنية",
    keywords: "AI ذكاء اصطناعي تعلم آلة روبوت",
    content:
      "الذكاء الاصطناعي هو مجال في علوم الحاسوب يهدف إلى إنشاء أنظمة قادرة على التعلم والتحليل واتخاذ القرارات.",
  },

  {
    title: "نظام أندرويد",
    category: "تقنية",
    keywords: "اندرويد هاتف جوجل تطبيقات",
    content:
      "أندرويد هو نظام تشغيل للهواتف الذكية طورته شركة جوجل ويستخدم في ملايين الأجهزة حول العالم.",
  },

  {
    title: "البرمجة",
    category: "تقنية",
    keywords: "كود لغة برمجة تطوير تطبيقات",
    content:
      "البرمجة هي كتابة تعليمات للحاسوب باستخدام لغات مثل JavaScript وPython وTypeScript لإنشاء البرامج.",
  },

  {
    title: "بايثون",
    category: "برمجة",
    keywords: "python لغة برمجة",
    content:
      "بايثون لغة برمجة عالية المستوى تستخدم في الذكاء الاصطناعي وتحليل البيانات وتطوير التطبيقات.",
  },

  {
    title: "الشمس",
    category: "علوم",
    keywords: "شمس كوكب نظام شمسي",
    content: "الشمس هي النجم الموجود في مركز النظام الشمسي وتوفر الضوء والطاقة للأرض.",
  },

  {
    title: "الأرض",
    category: "علوم",
    keywords: "كوكب أرض حياة",
    content: "الأرض هي الكوكب الثالث من الشمس وهي المكان الوحيد المعروف بوجود حياة.",
  },

  {
    title: "القمر",
    category: "علوم",
    keywords: "قمر فضاء",
    content: "القمر هو القمر الطبيعي الوحيد للأرض ويدور حولها.",
  },

  {
    title: "الإنترنت",
    category: "تقنية",
    keywords: "شبكة انترنت اتصال",
    content: "الإنترنت شبكة عالمية تربط ملايين الأجهزة وتسمح بتبادل المعلومات.",
  },
];

async function run() {
  const db: any = await getDatabase();

  for (const item of data) {
    const stmt = db.prepare(`
INSERT INTO knowledge
(title,content,category,keywords)
VALUES (?,?,?,?)
`);

    stmt.run([item.title, item.content, item.category, item.keywords]);

    stmt.free();
  }

  saveDatabase();

  console.log("تمت إضافة المعرفة بنجاح:", data.length);
}

run();
