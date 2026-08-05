# Nico AI — تطبيق أندرويد (apps/mobile)

هذا المجلد هو **غلاف الهاتف** لتطبيق نيكو. لا يحتوي على عقل ولا ذاكرة:
كل المنطق يبقى في `src/packages/*` (NicoBrain, Memory, Personality, Learning,
Voice) وكل البيانات تبقى في Lovable Cloud (Supabase).

الحل المستخدم: **Capacitor** — لأن تطبيق الويب الحالي (TanStack Start + React)
يعمل كما هو داخل WebView، فلا حاجة لإعادة كتابة أي شاشة أو أي مهارة.
(React Native كان سيعني إعادة بناء كل الواجهة والعقل مرتين.)

## البنية

```text
capacitor.config.ts            إعدادات البناء (App name / Package / Splash)
apps/mobile/resources/         الأيقونة وشاشة البداية
apps/mobile/android/           ملفات أندرويد الأصلية (خدمة الصوت + Manifest)
src/packages/mobile/           طبقة الهاتف بالتايب سكربت
src/packages/mobile-bridge/    عقد الجسر (web ↔ native)
src/routes/mobile/             شاشات التطبيق (صوت أولاً + الإعدادات)
```

نقطة دخول التطبيق داخل الـ WebView هي المسار `/mobile`.

## التشغيل على جهاز

```bash
bun install
npx cap add android          # ينشئ مجلد android/ مرة واحدة
bun run build
npx cap sync android
npx cap run android          # أو: npx cap open android ثم Run من Android Studio
```

أثناء التطوير يقرأ التطبيق من رابط المعاينة مباشرة (`server.url` في
`capacitor.config.ts`) فتظهر التعديلات فوراً بدون إعادة بناء.

## بناء نسخة إنتاج

1. احذف كتلة `server` من `capacitor.config.ts`.
2. `bun run build && npx cap sync android`
3. من Android Studio: **Build → Generate Signed Bundle / APK**.

- App name: `Nico AI`
- Package name: `com.nico.ai`
- الأيقونة: `apps/mobile/resources/icon.png`
- شاشة البداية: `apps/mobile/resources/splash.png`

لتوليد أيقونات كل الكثافات:

```bash
npx @capacitor/assets generate --android --assetPath apps/mobile/resources
```

## متغيرات البيئة

التطبيق يستخدم نفس الواجهة الخلفية للويب، فلا مفاتيح داخل التطبيق:
`LOVABLE_API_KEY` يبقى على الخادم، والتطبيق ينادي `/api/nico/*` فقط.
`VITE_SUPABASE_*` تُبنى داخل حزمة الويب كما هي اليوم.

## الملفات الأصلية

- `android/VoiceBackgroundService.kt` — خدمة الأمامية (foreground service)
  التي تُبقي جلسة الصوت وكلمة التنبيه حيّة.
- `android/NicoVoiceServicePlugin.kt` — الإضافة التي تربطها بالجسر
  (`Capacitor.Plugins.NicoVoiceService`).
- `android/AndroidManifest.additions.xml` — الصلاحيات وتعريف الخدمة.

انسخها بعد `npx cap add android` إلى
`android/app/src/main/java/com/nico/ai/`، وسجّل الإضافة في `MainActivity.java`
عبر `registerPlugin(NicoVoiceServicePlugin.class)`.

## كلمة التنبيه (wake word)

- الخدمة الأصلية تبث `com.nico.ai.WAKE_EVENT` عند كشف «يا نيكو».
- `NicoVoiceServicePlugin` يحوّله إلى حدث `wake` في الجسر.
- `src/packages/mobile-bridge/wake.ts` يلتقطه و`useNicoMobile` يبدأ محادثة
  بدون يدين على نفس العقل والذاكرة.
- محرك الكشف نفسه (`VoiceBackgroundService.WakeWordEngine`) واجهة قابلة للحقن،
  تُربط لاحقاً بـ Porcupine أو Vosk دون تعديل أي كود آخر.

## تهيئة مجلد أندرويد

```bash
bun run mobile:init
cp apps/mobile/android/*.kt apps/mobile/android/MainActivity.java \
   android/app/src/main/java/com/nico/ai/
# ثم ادمج apps/mobile/android/AndroidManifest.additions.xml
bun run mobile:build && bun run mobile:run
```
