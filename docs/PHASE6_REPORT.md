# Phase 6 — Voice First Experience (تقرير المرحلة)

## الملفات الجديدة

- `src/packages/voice/VoiceActivityDetector.ts` — كشف نشاط الصوت (بداية الكلام، الإيقاف بعد الصمت، حد أقصى للتسجيل، فحص كل 100ms لتقليل استهلاك البطارية).
- `src/components/nico/WelcomeExperience.tsx` — تجربة أول تشغيل: أفاتار نيكو + الترحيب المنطوق + إذن الميكروفون + اختيار اللغة + دخول/ضيف.
- `docs/PHASE6_REPORT.md` — هذا التقرير.

(من نفس المرحلة سابقاً: `VoiceProfile.ts`, `VoiceSessionManager.ts`, `WakeWordManager.ts`, `LocalVoiceCache.ts`, `src/routes/nico.tsx`, `src/packages/voice/__tests__/voice.test.ts`.)

## الملفات المعدلة

- `src/packages/voice/VoiceProfile.ts` — الشكل الجديد: `voiceId`, `language`, `speed`, `pitch`, `style` + ترحيل تلقائي من الشكل القديم (`voiceName`/`tone`).
- `src/packages/voice/SpeechToText.ts` — `start(options)` مع VAD، `hasSpeech()`، إيقاف تلقائي.
- `src/packages/voice/VoiceSessionManager.ts` — خطافات `onAutoStop` / `onSpeechStart` وعلم `continuous`.
- `src/hooks/useNico.ts` — حلقة المحادثة (`startConversation` / `stopConversation` / `continuous`)، ربط VAD، `isGuest`، مزامنة تفضيلات الصوت.
- `src/routes/index.tsx` — واجهة صوت أولاً: أزيل صندوق الدردشة، والسجل النصي صار قابلاً للطي كمساعد فقط.
- `src/routes/nico.tsx` — زر المحادثة المستمرة، مؤشر الطبقة (pitch)، شاشة الترحيب.
- `src/packages/permissions/PermissionManager.ts` + `src/packages/shared/types.ts` + `PermissionsBar.tsx` — أذونات: Microphone, Notifications, Background Audio, Bluetooth, Contacts, Location, Camera, Files.

## الحالة

- **Voice Manager**: جاهز — دورة كاملة (استماع → STT → NicoBrain → TTS → استماع) مع تتبع الجلسة وحفظها سحابياً.
- **STT**: جاهز — WAV 16kHz، لغة/مدة/ثقة، تلميح لغة، إيقاف تلقائي بالـVAD.
- **TTS**: جاهز — بث SSE/PCM، صوت وسرعة ونبرة وطبقة من `VoiceProfile`.
- **Avatar**: أوّلي — كرة نيكو المتحركة تتفاعل مع مستوى الصوت (لا يوجد أفاتار ثلاثي الأبعاد بعد).
- **Permissions**: جاهز — طلب عند الاستخدام فقط، قابل للإلغاء، محفوظ محلياً.
- **Guest/Registered**: الضيف بذاكرة محلية مؤقتة بلا بيانات حساسة؛ المسجل يربط Supabase User + Profile + Memories + Learning + Conversations.

## القيود الحالية

- كلمة الإيقاظ نصية فقط (تُستخرج من النص المنقول)؛ لا يوجد كاشف صوتي دائم بعد.
- `pitch` يُطبّق عبر تعليمات الصوت لأن مزود TTS لا يقبل معامل طبقة مباشر.
- لا يوجد صوت في الخلفية حقيقي على الويب (الإذن مخزَّن كموافقة مستخدم فقط).
- Bluetooth/Contacts تعتمد على واجهات متصفح غير مدعومة في كل المتصفحات.

## خطة Phase 7

1. كاشف كلمة إيقاظ صوتي دائم منخفض الطاقة (WASM/on-device) وربطه بـ`WakeWordManager.registerDetector`.
2. مقاطعة نيكو أثناء كلامه (barge-in) عبر VAD أثناء التشغيل.
3. أصوات شخصية/مستنسخة متعددة وتبديلها حسب السياق.
4. تشغيل في الخلفية وإشعارات صوتية للتذكيرات.
5. تحسين زمن الاستجابة: بث STT جزئي وبدء التفكير قبل انتهاء الكلام.
