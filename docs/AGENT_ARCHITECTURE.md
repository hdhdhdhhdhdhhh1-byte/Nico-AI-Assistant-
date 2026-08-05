# Nico Agent Architecture — طبقة الوكيل الذكي

هذه الوثيقة تكمل `ARCHITECTURE.md` وتشرح طبقة الوكيل (Agent) التي حوّلت نيكو
من مساعد بسيط إلى معمارية AI Agent. البنية السابقة لم تُحذف؛ الملفات القديمة
(`IntentEngine`, `Planner`, `ReasoningEngine`, `ResponseEngine`) لا تزال موجودة
وتُستخدم كطبقة أساس داخل المحركات الجديدة.

## المسار الجديد

```text
Input
 ↓ Conversation Manager   (session + reference resolution)
 ↓ Intent Engine          (category + segmentation)
 ↓ Planner                (multi-step plan + dependencies)
 ↓ Reasoning Engine       (skill choice + permissions + memory + style)
 ↓ Skill Execution        (ordered, dependency-aware)
 ↓ Memory Update          (short/long term + profile)
 ↓ Response Engine        (natural speech + voice hints)
```

## الحزم

```text
src/packages/
├── conversation/
│   ├── ConversationMemory.ts   سجل الدورات + المواضيع النشطة
│   ├── ContextManager.ts       الخانات، آخر إجراء، حل الإشارات
│   ├── SessionManager.ts       دورة حياة الجلسة والخمول
│   └── index.ts                ConversationEngine (الواجهة)
└── core/
    ├── intent/     AdvancedIntentEngine
    ├── planner/    TaskPlanner
    ├── reasoning/  ReasoningLayer (+ ReasoningEngine للنموذج)
    └── response/   ResponseComposer
```

العقود المشتركة للطبقة الجديدة في `src/packages/shared/agent.ts`
(`RichIntent`, `AgentPlan`, `ReasoningDecision`, `AgentTrace`, `Topic` …).

## 1) Conversation Engine

- **ConversationMemory**: آخر 24 دورة + قائمة مواضيع مرتّبة حسب النشاط.
- **ContextManager**: يحوّل الجمل الناقصة إلى طلبات مكتملة:
  - «وماذا عن بكرة؟» → يُدمج مع آخر طلب في الموضوع النشط.
  - «كررها / do it again» → يعيد آخر إجراء منفّذ.
  - «تذكر هذا» → يُوجَّه إلى مسار الذاكرة.
- **SessionManager**: معرّف جلسة، عدد الدورات، وتدوير تلقائي بعد 30 دقيقة خمول
  مع تنظيف السياق.

## 2) Advanced Intent Engine

يضيف فوق التصنيف القاعدي:

| الفئة            | مثال               |
| ---------------- | ------------------ |
| `question`       | ما عاصمة اليابان؟  |
| `command`        | أطفئ الإضاءة       |
| `reminder`       | ذكرني بعد 10 دقائق |
| `search`         | ابحث عن مطعم       |
| `personal_info`  | اسمي خالد          |
| `task_execution` | احجز موعد          |
| `conversation`   | مرحبا              |

كما يقسّم الطلبات المركّبة (`segments`) ويعلّم الطلبات المرجعية (`isReference`).

## 3) Planning Engine

`TaskPlanner` يبني `AgentPlan` بخطوات مرقّمة ومترابطة:

```text
"ذكرني بكرة وأرسل رسالة"
 → Step 1: reminder      (dependsOn: [])
 → Step 2: message       (dependsOn: [Step 1])
 → Step 3: execute       (dependsOn: [Step 2])
```

كل خطوة تحمل: `order`, `category`, `dependsOn`, `requiresPermissions`, `optional`.

## 4) Reasoning Layer

قبل أي تنفيذ يقرر:

- **المهارة الصحيحة** لكل خطوة (ويتجاهل غير المسجّلة).
- **الصلاحيات** عبر `SecurityLayer` (رفض افتراضي) → `executable` مقابل `blocked`.
- **الذاكرة**: هل نحتاج استرجاعاً أو كتابة؟
- **الحاجة للنموذج**: الأوامر التنفيذية المباشرة لا تستدعي LLM.
- **أسلوب الرد**: `brief | informative | confirming | empathetic | playful`.
- **التعقيم**: إخفاء الأرقام والبريد قبل إرسال النص للنموذج.

يُعاد كل ذلك داخل `ReasoningDecision` مع `rationale` قابل للعرض في اللوحة.

## 5) Response Engine

`ResponseComposer` يدمج نتائج المهارات + استدلال النموذج + رسائل الصلاحيات
في نطق واحد بشخصية نيكو، ويعيد تلميحات صوتية (`rate`, `pauseAfterMs`) حسب
الأسلوب المختار، ولا يعيد نصاً فارغاً أبداً.

## التتبّع (Observability)

كل دورة تُرجع `AgentTrace`: الجلسة، الإشارة المحلولة، النية، قرار الاستدلال،
الخطوات المنفّذة، عدد الذكريات المكتوبة، وزمن المعالجة. متاح من `useNico()`
عبر `lastTrace` و`session` و`activeTopic`.

## الاختبارات

```bash
npm run test       # vitest run
npm run test:watch
```

التغطية الحالية: حل الإشارات وتدوير الجلسة، تصنيف النوايا السبع، تقسيم
الطلبات المركّبة، ترابط خطوات الخطة، حجب الصلاحيات، اختيار الأسلوب، وتعقيم
البيانات الحساسة.
