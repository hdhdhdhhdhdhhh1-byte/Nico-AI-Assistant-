# Phase 8 — Nico AI على أندرويد

تحويل نيكو من مساعد صوتي على الويب إلى **تطبيق أندرويد مستقل** يعمل بالصوت
أولاً، بنفس العقل والذاكرة والشخصية. لم يُعد بناء أي نظام: `NicoBrain`،
`MemoryManager`، `PersonalityEngine`، `LearningEngine`، `VoiceManager`،
Supabase والمصادقة كلها كما هي.

## 1) تغييرات المعمارية

| الطبقة                                             | الحالة                                   |
| -------------------------------------------------- | ---------------------------------------- |
| العقل / الذاكرة / الشخصية / التعلّم                | **بدون أي تغيير**                        |
| الواجهة الخلفية (`/api/nico/*`, Supabase)          | **بدون أي تغيير**                        |
| الجسر `src/packages/mobile-bridge`                 | أُضيف تنفيذ Capacitor بجانب تنفيذ الويب  |
| طبقة جديدة `src/packages/mobile`                   | أذونات الهاتف + خدمة الصوت + ترقية الضيف |
| شاشات جديدة `src/routes/mobile/*`                  | تجربة الهاتف والإعدادات                  |
| غلاف أندرويد `apps/mobile` + `capacitor.config.ts` | جديد                                     |

### لماذا Capacitor وليس React Native؟

واجهة نيكو وعقله مكتوبان بالكامل بـ React/TypeScript داخل تطبيق TanStack
Start واحد. Capacitor يشحن نفس التطبيق داخل WebView ويعطيه صلاحيات وخدمات
أندرويد أصلية، بينما React Native كان سيفرض إعادة كتابة كل الواجهات وازدواج
مسار الصوت. النتيجة: تطبيق واحد، عقل واحد، صيانة واحدة.

## 2) بنية الموبايل

```text
capacitor.config.ts                 App name: Nico AI · Package: com.nico.ai
apps/mobile/
├── README.md                       خطوات البناء والتشغيل
├── resources/icon.png, splash.png  الأيقونة وشاشة البداية
└── android/
    ├── VoiceBackgroundService.kt   خدمة أمامية للصوت وكلمة التنبيه
    ├── NicoVoiceServicePlugin.kt   ربطها بجسر جافاسكربت
    └── AndroidManifest.additions.xml

src/packages/mobile/
├── MobilePermissions.ts            أذونات الهاتف عند الحاجة فقط
├── VoiceBackgroundService.ts       دورة حياة الجلسة + إعادة الاتصال
├── GuestUpgrade.ts                 ترقية بيانات الضيف عند التسجيل
└── index.ts                        initNicoMobile() · tapFeedback()

src/packages/mobile-bridge/capacitor.ts   CapacitorMobileBridge
src/hooks/useNicoMobile.ts                غلاف useNico للهاتف
src/routes/mobile/index.tsx               الشاشة الرئيسية (صوت أولاً)
src/routes/mobile/settings.tsx            إعدادات نيكو
```

نقطة دخول التطبيق داخل WebView هي `/mobile`.

## 3) تجربة التشغيل الأولى

عند أول فتح تظهر شاشة `MobileOnboarding`:

1. Avatar نيكو مع نص الترحيب.
2. إذن الميكروفون (ضروري).
3. إذن الإشعارات.
4. اختيار اللغة (عربي / إنجليزي).
5. تسجيل الدخول أو المتابعة كضيف.

بمجرد الضغط على "ابدأ التحدث مع نيكو" يُستدعى `greet({ force: true })`
فينطق نيكو الترحيب صوتياً — لا شيء في البداية يعتمد على الكتابة.

## 4) مسار الصوت

```text
فتح التطبيق → initNicoMobile() → Idle
   ↓ لمس الكرة أو كلمة «يا نيكو»
Listening → SpeechToText (/api/nico/transcribe)
   ↓
NicoBrain → Memory Retrieval → Reasoning (/api/nico/think)
   ↓
TextToSpeech (/api/nico/speak, SSE PCM) → Speaking → Idle
```

الكتابة موجودة كخيار مطوي أسفل الشاشة فقط.

## 5) حالات نيكو

| الحالة      | ما يراه المستخدم                  |
| ----------- | --------------------------------- |
| `idle`      | كرة ساكنة تتنفس + "اضغط للتحدث"   |
| `listening` | موجات صوتية حيّة تتبع مستوى الصوت |
| `thinking`  | حركة انتظار على الكرة             |
| `speaking`  | نبض الكرة مع الصوت                |
| `sleeping`  | جاهزية دائمة — "قل «يا نيكو»"     |

تُشتق من `derivePresence` الموجودة، وتُعرض عبر `NicoOrb` و`VoiceWaves`
و`PRESENCE_LABEL`.

## 6) الأذونات

`MobilePermissions` يغلّف `PermissionManager` الحالي ولا يستبدله:

| الإذن            | متى يُطلب                |
| ---------------- | ------------------------ |
| Microphone       | في التهيئة (ضروري للصوت) |
| Notifications    | في التهيئة (للتذكيرات)   |
| Location         | عند أول طلب طقس أو ملاحة |
| Bluetooth        | عند أول أمر لجهاز قريب   |
| Background audio | عند تفعيل «يا نيكو» فقط  |

كل إذن قابل للسحب من صفحة الإعدادات، ولكل إذن سبب منطوق.

## 7) الخلفية والبطارية

- الخدمة الأمامية لا تبدأ إلا بعد تفعيل المستخدم للجاهزية الدائمة.
- إشعار دائم يوضح أن نيكو يستمع (شرط أندرويد).
- `foregroundServiceType="microphone"` مع `START_STICKY` لإعادة التشغيل.
- عند تصغير التطبيق: تُغلق أي جلسة ميكروفون مفتوحة، وتُستأنف عند العودة.
- عند الإيقاف أو مغادرة الشاشة: `dispose()` يوقف الخدمة والمستمعين.

## 8) الحساب والذاكرة

- ضيف: كل شيء محلي ومؤقت كما كان.
- عند تسجيل الدخول: `upgradeGuestData` يرفع ذكريات الضيف والملف الشخصي إلى
  الحساب مرة واحدة لكل جهاز، ثم تتولى مزامنة `nicoSync` الحالية الباقي
  (الرسائل، التعلّم، الجلسات الصوتية، تفضيلات الصوت).

## 9) الأداء والموثوقية

- Offline fallback: شريط "لا يوجد اتصال" + `resolveOffline` الحالية.
- Voice reconnect: إعادة تسليح المحادثة بعد العودة من الخلفية.
- Error handling: أخطاء الأذونات والصوت تُعرض بدل أن تُبتلع.
- Crash protection: `errorComponent` خاص بشاشة الهاتف بدل شاشة بيضاء.

## 10) القيود الحالية

- محرك كلمة التنبيه غير مدمج: `WakeWordEngine` واجهة جاهزة تنتظر
  Porcupine/Vosk. حتى ذلك الحين يعمل الكشف داخل التطبيق عبر التعرف على الكلام.
- التقاط جهات الاتصال والتحكم بمستوى الصوت يحتاجان إضافات أصلية.
- مجلد `android/` نفسه يُنشأ محلياً بـ `npx cap add android` (يحتاج Android
  SDK)، فهو غير مرفوع هنا؛ ملفات Kotlin جاهزة للنسخ إليه.
- الاستماع بالخلفية محكوم بقيود أندرويد 14 لتشغيل الميكروفون خلفياً.

## 11) المرحلة القادمة

1. دمج محرك wake word حقيقي داخل الخدمة.
2. تسجيل نيكو كـ Assistant افتراضي (`VoiceInteractionService`) للرد من زر
   الطاقة.
3. إشعارات دفع للتذكيرات عبر FCM بدل التذكير المحلي فقط.
4. وضع بلا اتصال أوسع: تخزين مؤقت للردود المتكررة وطابور مزامنة.
5. نشر على Google Play بعد اختبار البطارية والصلاحيات.
