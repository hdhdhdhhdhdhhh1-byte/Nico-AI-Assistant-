# Phase 7 — Real Voice Assistant Experience

No rebuild, no architecture change. Everything below extends the existing
NicoBrain / VoiceManager / Memory / Personality / Cloud stack.

## 1. Auto Greeting System

- `NICO_AUTO_GREETING` in `src/packages/core/personality.ts`.
- `WelcomeExperience` no longer speaks on mount; it speaks the greeting the
  moment the microphone permission is granted (satisfies autoplay policy).
- Returning users: `useNico` greets automatically on load when the mic is
  already granted and `autoGreeting` is on. Greeting fires once per load
  (`greeted` / `greet({ force })`).

## 2. Continuous Voice Mode ("Always Ready")

`setAlwaysReady(true)` → ensure mic + background audio → start the mobile
bridge background service → arm the wake-word detector.
Loop: **Wake → Listen → Think → Speak → Return to sleeping**.
If no wake-word backend exists (desktop browsers without SpeechRecognition),
Nico falls back to the hands-free conversation loop so presence is preserved.

## 3. Wake Word Architecture

`src/packages/voice/WakeWordManager.ts`

- Pluggable `WakeWordDetector` (arm / disarm).
- Default browser detector via `SpeechRecognition` (`useDefaultDetector(lang)`).
- Text detector `matchesWakeWord` / `stripWakeWord` for push-to-talk transcripts.
- Phrases: «يا نيكو», «هاي نيكو», "hey nico", "hi nico", "nico".
- Native Android detection can register a detector without any UI change.

## 4. Voice Personality

`NICO_PHRASES` + `humanize()` rewrite robotic output into spoken Arabic
("تمام، نفذت لك الأمر", "ثانية وأجيب لك المعلومة"). All replies pass through
`humanize()` before TTS and before persistence, so history reads naturally.

## 5. Assistant Presence

`AssistantPresence = idle | listening | thinking | speaking | sleeping`

- `derivePresence(state, { wakeWordArmed })` adds _sleeping_.
- `NicoOrb` animates per state: pulse (listening/speaking), orbit ring
  (thinking), dimmed + scaled-down (sleeping).
- Exposed as `nico.presence` and used on `/` and `/nico`.

## 6. Permission Manager (just-in-time)

- `PERMISSION_REASONS` — a human sentence per capability.
- `INTENT_PERMISSIONS` + `permissionForIntent()` — weather → location,
  calls → contacts, always-ready → background audio.
- `ensure(key)` requests only at the moment of need; every outcome is written
  to `device_permissions` and logged to `assistant_events`.

## 7. Mobile Native Bridge

`src/packages/mobile-bridge/`

- `types.ts` — `BackgroundService`, `NotificationChannel`, `DeviceActions`
  (call, SMS, contacts), `MobileBridge`.
- `index.ts` — `WebMobileBridge` no-op/web fallback and `mobileBridge()`
  accessor; a native layer registers itself with the same interface.

## 8. Database

New tables (RLS on, owner-scoped, GRANTed):

- `voice_settings` — wake word, wake_word_enabled, always_ready,
  auto_greeting, voice_id, speed, pitch, style, language.
- `device_permissions` — permission, status, platform, timestamps.
- `assistant_events` — event_type, detail, created_at.

Sync layer: `nicoSync.getVoiceSettings / saveVoiceSettings /
saveDevicePermission / logEvent`, backed by authenticated server functions in
`src/lib/nico.functions.ts`.

## Status

- Typecheck: clean.
- Tests: 30 passed (5 files).
- Guests keep full local functionality; cloud writes are skipped when signed out.

### Known limits

- Browser wake word depends on `SpeechRecognition` (Chrome/Edge); Safari and
  Firefox fall back to hands-free mode.
- True background listening requires the native Android bridge.
