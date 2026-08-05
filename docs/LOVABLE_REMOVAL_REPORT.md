# Lovable Removal Report — Phase 11

## Runtime dependencies found & removed

| Reference                                                | File(s)                                                                 | Replacement                                          |
| -------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------- |
| `https://ai.gateway.lovable.dev/v1/chat/completions`     | `src/routes/api/nico/think.ts`                                          | `aiClient.chat()` via `src/lib/ai/*`                 |
| `https://ai.gateway.lovable.dev/v1/audio/transcriptions` | `src/routes/api/nico/transcribe.ts`                                     | `aiClient.transcribe()`                              |
| `https://ai.gateway.lovable.dev/v1/audio/speech`         | `src/routes/api/nico/speak.ts`                                          | `aiClient.speak()`                                   |
| `@lovable.dev/cloud-auth-js` (npm)                       | `src/integrations/lovable/index.ts`, `package.json`                     | Supabase Auth (`supabase.auth.signInWithOAuth`)      |
| `reportLovableError` / `__lovableEvents`                 | `src/lib/lovable-error-reporting.ts` (deleted), `src/routes/__root.tsx` | Local `logRuntimeError` (`console.error`, pluggable) |
| `LOVABLE_API_KEY` env                                    | 3 nico API routes                                                       | `AI_API_KEY` / `AI_API_URL` / `AI_MODEL`             |

## Files touched

- `src/lib/ai/ai.config.ts` (new) — env-driven provider config.
- `src/lib/ai/providers.ts` (new) — OpenAI-compatible REST adapter.
- `src/lib/ai/ai.client.ts` (new) — public entry point (`chat`, `transcribe`, `speak`).
- `src/routes/api/nico/think.ts` — uses `aiClient.chat`.
- `src/routes/api/nico/transcribe.ts` — uses `aiClient.transcribe`.
- `src/routes/api/nico/speak.ts` — uses `aiClient.speak`.
- `src/integrations/lovable/index.ts` — shim now delegates to Supabase Auth.
- `src/routes/__root.tsx` — dropped Lovable error hook.
- `src/lib/lovable-error-reporting.ts` — deleted.
- `package.json` — dropped `@lovable.dev/cloud-auth-js`.

## Intentionally kept

- `@lovable.dev/vite-tanstack-config` (devDependency) — pure build tooling that
  bundles TanStack Start + Vite plugins. It never ships to the runtime and is
  not required at runtime. Swap for a hand-rolled `vite.config.ts` if you also
  want to remove the build-time dependency.
- Commented placeholder URL in `capacitor.config.ts` (documentation only).

## Verification

```bash
grep -R "lovable" -n src apps package.json
```

After migration the only hits are:

- `src/integrations/lovable/*` — internal shim name (no external calls).
- `docs/*` and comments referencing the migration itself.
- `@lovable.dev/vite-tanstack-config` in `package.json` devDependencies.

No source code calls `ai.gateway.lovable.dev`, no runtime dependency on any
`@lovable.dev/*` package.
