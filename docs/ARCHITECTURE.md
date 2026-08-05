# Nico AI Platform — المعمارية

مساعد شخصي **صوتي أولاً** مبني بمعمارية نظيفة وقابلة للتوسع.

> ملاحظة عملية: بيئة Lovable تشغّل تطبيق TanStack Start واحد، لذلك تم تنفيذ
> الـ monorepo كحزم معزولة داخل `src/packages/*` بنفس الحدود والعقود المطلوبة.
> كل حزمة مستقلة ويمكن نقلها كما هي إلى `packages/*` في monorepo (pnpm/turbo)
> عند الانتقال إلى تطبيق موبايل React Native أو خادم Node مستقل.

## الخريطة

```text
src/packages/
├── core/         NicoBrain · IntentEngine · Planner · ReasoningEngine · ResponseEngine · personality
├── memory/       ShortTermMemory · LongTermMemory · UserProfile · MemoryManager
├── voice/        SpeechToText · TextToSpeech · VoiceManager
├── skills/       SkillManager · PluginSystem · BuiltInSkills (+ builtin/*)
├── permissions/  PermissionManager · SecurityLayer
├── tasks/        Scheduler · ReminderEngine · AutomationEngine
└── shared/       Types (العقود المشتركة)

src/routes/api/nico/   transcribe (STT) · think (Reasoning) · speak (TTS streaming)
src/routes/index.tsx   واجهة الصوت (Web App)
src/routes/dashboard   لوحة الإدارة
```

## مسار الطلب

```text
Voice Input → SpeechToText (WAV 16kHz) → /api/nico/transcribe
   → NicoBrain → IntentEngine → Planner → SecurityLayer/Permissions
   → SkillManager (تنفيذ المهارات) → MemoryManager (فحص/كتابة الذاكرة)
   → ReasoningEngine (/api/nico/think) → ResponseEngine
   → TextToSpeech (/api/nico/speak, SSE PCM) → Voice Output
```

## الذاكرة

- **قصيرة المدى**: آخر 12 دورة + خانات السياق الحالية، في الذاكرة فقط.
- **طويلة المدى**: اسم المستخدم، تفضيلاته، عاداته، وحقائق طلب حفظها.
- **MemoryManager**: يقرر ماذا يُحفظ (الضيف = مؤقت فقط)، ومتى يُسترجع، ويبني
  ملخصاً مضغوطاً (`digest()`) يُمرَّر لمحرك الاستدلال.

## المهارات (Plugins)

كل مهارة تنفذ واجهة `Skill` وتُسجَّل في `PluginSystem`. إضافة مهارة جديدة
لا تتطلب أي تعديل في القلب:

```ts
skillManager.install({
  id: "music",
  name: "الموسيقى",
  description: "تشغيل الموسيقى",
  intents: ["smalltalk"],
  permissions: [],
  async execute() {
    return { ok: true, speech: "شغّلت الموسيقى." };
  },
});
```

المهارات الجاهزة: Weather · Calendar · Reminder · Search · SmartHome · Memory.

## الأمان

`PermissionManager` يخزّن قرار كل صلاحية (ميكروفون، موقع، ملفات، كاميرا،
إشعارات) بوضع **رفض افتراضي**، و`SecurityLayer` يوقف تنفيذ أي مهارة قبل
الوصول لقدرة غير مصرّح بها، ويخفي الأرقام الحساسة قبل إرسال النص للنموذج.

## الطبقة الخلفية

مفاتيح الذكاء الاصطناعي لا تصل للمتصفح إطلاقاً؛ كل النداءات تمر عبر مسارات
الخادم في `src/routes/api/nico/*` باستخدام `LOVABLE_API_KEY`:

| المسار                      | الوظيفة                                  | النموذج                         |
| --------------------------- | ---------------------------------------- | ------------------------------- |
| `POST /api/nico/transcribe` | تحويل الصوت إلى نص                       | `openai/gpt-4o-mini-transcribe` |
| `POST /api/nico/think`      | تحليل النية + التوليد + استخراج الذكريات | `google/gemini-3.6-flash`       |
| `POST /api/nico/speak`      | تحويل النص إلى صوت (SSE/PCM)             | `openai/gpt-4o-mini-tts`        |
