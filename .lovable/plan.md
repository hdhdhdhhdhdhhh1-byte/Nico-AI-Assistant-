# Phase 10 — Production Release Preparation

نطاق ضخم يلمس كل الطبقات. لن أعيد بناء أي نظام؛ فقط طبقات إنتاجية فوق الأنظمة الحالية (NicoBrain, Memory, Personality, Learning, Voice, Skills, Mobile, Supabase).

## 1. Production Audit

- فحص شامل: routes, packages, RLS policies, secrets, voice, mobile, Android.
- إنشاء `docs/FINAL_PRODUCTION_REPORT.md` يشمل: الأنظمة المكتملة/الناقصة، المشاكل، توصيات الإطلاق.

## 2. Android Production Build (`apps/mobile`)

- تحديث `capacitor.config.ts`: `appId=com.nico.ai`, إزالة `server.url` لبناء إنتاج، إضافة `bundledWebRuntime`.
- إضافة `apps/mobile/android/build.gradle.additions` (versionCode/versionName strategy).
- توليد أيقونة + Splash عبر imagegen، حفظها تحت `apps/mobile/android/resources/`.
- مراجعة الأذونات في `AndroidManifest.additions.xml` (حذف الغير مستخدم افتراضياً).
- ملف `apps/mobile/README.md` محدّث بخطوات: `bun run build && npx cap sync android && ./gradlew assembleRelease / bundleRelease`.
- توثيق APK vs AAB و Google Play checklist في `docs/ANDROID_BUILD.md`.

## 3. Offline Support Layer

- حزمة جديدة `src/packages/offline/`:
  - `OfflineStore.ts` — IndexedDB (idb-keyval) لآخر المحادثات + إعدادات + memories snapshot.
  - `CommandQueue.ts` — طابور FIFO للأوامر عند offline.
  - `OfflineManager.ts` — يجمع الاثنين + `sync()` عند عودة الشبكة (يستخدم `nicoSync` الحالي، لا يستبدل Supabase).
- تكامل في `useNico`: enqueue عند فشل الشبكة، flush عند `online`.
- Offline-first: القراءة من الكاش أولاً، ثم تحديث من Supabase.

## 4. Security Hardening

- مراجعة RLS الحالية (كلها user-scoped ✅).
- إضافة `src/lib/validation.ts` (zod schemas لكل server function inputs).
- تفعيل `RateLimiter` على `/api/nico/think`, `/transcribe`, `/speak` (in-memory per user).
- `SecureStorage` wrapper حول localStorage (تشفير خفيف عبر Web Crypto AES-GCM بمفتاح من user id).
- تفعيل HIBP على auth عبر `configure_auth`.

## 5. Voice Production Enhancements

- في `VoiceSessionManager`:
  - Auto-reconnect عند انقطاع STT/TTS.
  - تحسين VAD thresholds + silence detection.
  - `interrupt()` API لقطع كلام Nico عند بدء المستخدم بالكلام (barge-in).
  - Battery awareness: خفض sample rate عند `navigator.getBattery()?.level < 0.2`.

## 6. AI Assistant Experience

- تعديل `src/routes/index.tsx`: عند التحميل → Avatar فوراً، auto-greet بالجملة الترحيبية، بدون زر chat.
- إبقاء زر ميكروفون فقط. الصوت أساسي.

## 7. Privacy Center

- Route جديد `src/routes/_authenticated/privacy.tsx`:
  - Export data (JSON download من كل الجداول الخاصة بالمستخدم).
  - Delete all data (بدون حذف الحساب).
  - Toggle Learning Engine.
  - Memory manager (list + delete).
  - Delete account (auth.admin.deleteUser عبر server fn محمي).
- رابط في `settings.tsx`.

## 8. Final Documentation

- `docs/ARCHITECTURE.md` (تحديث الموجود).
- `docs/DATABASE.md` (schema + RLS + grants).
- `docs/ANDROID_BUILD.md`.
- `docs/API_DOCUMENTATION.md` (server functions + api routes).
- `docs/FINAL_REPORT.md` (نتائج Phase 10 + testing).

## 9. Testing

- `bunx tsgo --noEmit` (typecheck).
- `bunx vitest run` (unit tests الحالية + إضافات للـ OfflineManager).
- Playwright smoke: تحميل `/`, ترحيب صوتي (mock), auth flow.
- تقرير النتائج في `FINAL_REPORT.md`.

## Technical Details

- لن يُلمس: `NicoBrain`, integrations/supabase/*, routeTree.gen, personality core.
- إضافات فقط + تعديلات سطحية على `useNico`, `index.tsx`, `settings.tsx`, `capacitor.config.ts`.
- Migrations Supabase: لا حاجة (RLS كامل موجود).
- Secrets: لا جديد.

## المخرجات

- ~15 ملف جديد، ~6 ملفات معدّلة، 5 مستندات، تقرير اختبار نهائي.
- الحجم كبير — سأنفذها على دفعات متوازية داخل نفس الجلسة.

هل أبدأ التنفيذ بهذا التقسيم؟ أو تريد تقليل النطاق (مثلاً تأجيل Privacy Center أو Offline Layer)؟
