# Phase 11 — Complete Lovable Independence

Goal: the repository must build and run against any Supabase project and any
OpenAI-compatible AI provider, with zero Lovable services required.

## What was removed

- Runtime dependency `@lovable.dev/cloud-auth-js` (package.json).
- Hard-coded `https://ai.gateway.lovable.dev` calls in all Nico API routes.
- `src/lib/lovable-error-reporting.ts` and its window hook.
- Environment reliance on `LOVABLE_API_KEY` for AI routes.

## What was added

- **AI provider layer** — `src/lib/ai/`
  - `ai.config.ts` — reads `AI_PROVIDER / AI_API_URL / AI_API_KEY / AI_MODEL`
    (plus optional `AI_STT_MODEL`, `AI_TTS_MODEL`, `AI_TTS_VOICE`).
  - `providers.ts` — OpenAI-compatible adapter (chat / STT / TTS).
  - `ai.client.ts` — single import surface: `aiClient.chat|transcribe|speak`.
- **Local runtime error logger** in `src/routes/__root.tsx` (wire to Sentry etc.
  if remote reporting is desired).
- **Supabase-only OAuth shim** at `src/integrations/lovable/index.ts` — same
  `lovable.auth.signInWithOAuth(...)` signature, but delegates directly to
  `supabase.auth.signInWithOAuth`. Call sites (`src/routes/auth.tsx`) are
  unchanged.

## New environment configuration

```env
# AI provider (OpenAI-compatible endpoint)
AI_PROVIDER=openai        # free-form label
AI_API_URL=https://api.openai.com/v1
AI_API_KEY=sk-...
AI_MODEL=gpt-4o-mini      # chat model
AI_STT_MODEL=gpt-4o-mini-transcribe   # optional
AI_TTS_MODEL=gpt-4o-mini-tts          # optional
AI_TTS_VOICE=alloy                    # optional
```

Works out of the box with:

- OpenAI — `AI_API_URL=https://api.openai.com/v1`
- OpenRouter — `AI_API_URL=https://openrouter.ai/api/v1`, `AI_MODEL=google/gemini-2.5-flash`
- Groq / LiteLLM / vLLM / any self-hosted OpenAI-compatible gateway
- The legacy Lovable gateway, if `LOVABLE_API_KEY` alone is set (backwards
  compatibility only — no new code depends on it).

For **auth**, Supabase env vars are unchanged (`SUPABASE_URL`,
`SUPABASE_PUBLISHABLE_KEY`, `VITE_*`). Configure Google OAuth in the Supabase
dashboard under _Authentication → Providers_.

## Verification

```bash
grep -R "lovable" -n src apps package.json
```

Remaining hits are the internal shim path (`src/integrations/lovable/`) and
the build-tooling devDependency `@lovable.dev/vite-tanstack-config`. No
runtime code calls a Lovable service.

## Project state

- Auth: Supabase (email/password + Google OAuth via Supabase native provider).
- AI: pluggable OpenAI-compatible provider layer (`src/lib/ai/*`).
- Storage / DB: Supabase (any project — no Lovable Cloud coupling).
- Voice / Memory / Personality / Learning / NicoBrain: **untouched**.
- Runs standalone from GitHub after `npm install` + `.env` configuration.

## Manual steps after clone

1. `cp .env.example .env` and fill Supabase + AI values.
2. `supabase db push` (or `supabase db reset`) to apply migrations.
3. Enable Google provider in Supabase dashboard (optional).
4. `npm install && npm run dev`.
