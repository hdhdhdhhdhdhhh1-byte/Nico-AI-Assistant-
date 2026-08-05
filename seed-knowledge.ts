import { getDatabase } from "./src/packages/knowledge/Database";

async function main() {
  const db = await getDatabase();

  const items = [
    {
      title: "عاصمة اليمن",
      content:
        "عاصمة اليمن هي صنعاء، وهي مدينة تاريخية قديمة وتعد من أقدم المدن المأهولة في العالم.",
      category: "جغرافيا",
      keywords: "اليمن عاصمة صنعاء مدينة",
    },
    {
      title: "اليمن",
      content: "اليمن دولة عربية تقع في جنوب غرب آسيا في شبه الجزيرة العربية. عاصمتها صنعاء.",
      category: "دول",
      keywords: "اليمن دولة عربية آسيا",
    },
    {
      title: "نظام أندرويد",
      content: "أندرويد هو نظام تشغيل للهواتف الذكية مبني على نواة لينكس وتطوره شركة جوجل.",
      category: "تقنية",
      keywords: "اندرويد جوجل هاتف نظام تشغيل",
    },
    {
      title: "جوجل",
      content: "جوجل شركة تقنية أمريكية تقدم خدمات البحث والخرائط والبريد والذكاء الاصطناعي.",
      category: "تقنية",
      keywords: "جوجل شركة بحث ذكاء اصطناعي",
    },
    {
      title: "الذكاء الاصطناعي",
      content:
        "الذكاء الاصطناعي هو مجال في علوم الحاسوب يهدف إلى جعل الأجهزة قادرة على التعلم واتخاذ القرارات.",
      category: "علوم",
      keywords: "ذكاء اصطناعي تعلم آلة تقنية",
    },
  ];

  for (const i of items) {
    db.exec(`
   INSERT INTO knowledge
   (title,content,category,keywords)
   VALUES
   (
    '${i.title}',
    '${i.content}',
    '${i.category}',
    '${i.keywords}'
   )
  `);
  }

  console.log("تمت إضافة المعرفة");
}

main();
