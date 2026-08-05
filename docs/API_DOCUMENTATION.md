# Nico AI — API Documentation

## Server Functions (`createServerFn`)

في `src/lib/nico.functions.ts`. تُستدعى عبر `nicoSync` من `useNico`. كلها
محمية بـ `requireSupabaseAuth` ما لم يُذكر خلاف ذلك.

| الاسم                   | Method | الإدخال               | الإخراج                                        |
| ----------------------- | ------ | --------------------- | ---------------------------------------------- |
| `getBootstrap`          | GET    | —                     | profile + voice + memories + last conversation |
| `updateProfile`         | POST   | UpdateProfileInput    | profile row                                    |
| `getVoicePreferences`   | GET    | —                     | voice_preferences                              |
| `saveVoicePreferences`  | POST   | VoicePreferencesInput | row                                            |
| `getVoiceSettings`      | GET    | —                     | voice_settings                                 |
| `saveVoiceSettings`     | POST   | VoiceSettingsInput    | row                                            |
| `saveVoiceSession`      | POST   | SaveVoiceSessionInput | row                                            |
| `listVoiceSessions`     | GET    | —                     | rows                                           |
| `ensureConversation`    | POST   | `{ id?, title? }`     | conversation                                   |
| `listConversations`     | GET    | —                     | rows                                           |
| `saveMessage`           | POST   | SaveMessageInput      | row                                            |
| `listMessages`          | POST   | `{ conversation_id }` | rows                                           |
| `saveMemory`            | POST   | SaveMemoryInput       | row                                            |
| `updateMemory`          | POST   | patch                 | row                                            |
| `deleteMemory`          | POST   | `{ id }`              | ok                                             |
| `deleteAllMemories`     | POST   | —                     | count                                          |
| `searchMemories`        | POST   | `{ query, limit }`    | rows                                           |
| `saveLearning`          | POST   | SaveLearningInput     | row                                            |
| `listLearning`          | GET    | —                     | rows                                           |
| `deleteLearning`        | POST   | `{ id }`              | ok                                             |
| `saveDevicePermission`  | POST   | DevicePermissionInput | row                                            |
| `listDevicePermissions` | GET    | —                     | rows                                           |
| `logAssistantEvent`     | POST   | AssistantEventInput   | ok                                             |
| `listAssistantEvents`   | GET    | —                     | rows                                           |
| `exportData`            | GET    | —                     | كامل بيانات المستخدم                           |
| `deleteAccount`         | POST   | —                     | ok                                             |

المخططات: `src/lib/validation.ts`.

## HTTP Endpoints (`src/routes/api/nico/*`)

محمية بـ `LOVABLE_API_KEY` على الخادم فقط. JSON إلا حيث يُذكر SSE.

### `POST /api/nico/transcribe`

```
{ audio: base64, mime?: "audio/webm", language?: "ar"|"en" }
→ { text, language, durationMs, confidence? }
```

النموذج: `openai/gpt-4o-mini-transcribe`.

### `POST /api/nico/think`

```
{ transcript, language?, context? }
→ { intent, speech, memoryHints[], plan[] }
```

النموذج: `google/gemini-3.6-flash`.

### `POST /api/nico/speak` (SSE)

```
{ text, voice?, speed? }
→ SSE: PCM chunks + "done"
```

النموذج: `openai/gpt-4o-mini-tts`.

## أخطاء موحّدة

- `401 Unauthorized` — bearer مفقود/منتهي.
- `422 ValidationError` — الإدخال لا يطابق schema.
- `429 RateLimited` — يُفعّل عند توفر infra.
- `503 UpstreamUnavailable` — Lovable AI Gateway معطل.
