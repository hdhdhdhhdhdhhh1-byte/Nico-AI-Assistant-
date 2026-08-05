# Nico AI — Migration Guide (Lovable → Standalone)

How to take this repository off Lovable and run it on your own machine or
servers with your own Supabase project. **Nothing in the codebase depends
on Lovable's infrastructure** — only on standard Supabase + a chat-completions
provider.

---

## 1. Prerequisites

- Node ≥ 20 and [`bun`](https://bun.sh) ≥ 1.1 (or npm/pnpm — bun is
  the default in `package.json`).
- [Supabase CLI](https://supabase.com/docs/guides/cli) ≥ 1.180.
- A Supabase account (free tier is enough).
- An LLM/STT/TTS provider key. Nico ships with the Lovable AI Gateway
  (`LOVABLE_API_KEY`); swap for OpenAI/Groq/etc. by editing
  `src/routes/api/nico/*.ts` (2 fetch calls, all endpoints are OpenAI-shaped).

---

## 2. Clone and install

```bash
git clone <your-fork>.git nico-ai
cd nico-ai
bun install
```

---

## 3. Create a new Supabase project

1. Go to <https://supabase.com/dashboard> → **New project**.
2. Save the **project ref**, **project URL**, **publishable (anon) key**,
   and **service role key**.
3. In _Authentication → Providers_ enable **Email** and (optionally) **Google**.
   For Google, set the redirect URL to your app origin
   (`http://localhost:3000` for dev, plus your production URL).

---

## 4. Link and apply migrations

```bash
supabase login
supabase link --project-ref <YOUR_PROJECT_REF>

# Recreate the full schema on the remote project
supabase db push
```

Or, for a fully local stack:

```bash
supabase start          # boots local Postgres + Auth + Studio
supabase db reset       # applies all migrations + seed.sql
```

All five migrations under `supabase/migrations/` are ordered and
idempotent. They create:

- Tables: `users`, `user_profiles`, `memories`, `conversations`, `messages`,
  `learning_records`, `voice_sessions`, `voice_preferences`, `voice_settings`,
  `device_permissions`, `assistant_events`.
- Functions: `touch_updated_at()`, `handle_new_auth_user()`.
- Triggers: `on_auth_user_created`, per-table `*_touch` updated-at triggers.
- RLS policies + explicit GRANTs on every table (default-deny; owner-only).

No storage buckets are needed — audio is streamed, not persisted.

---

## 5. Storage buckets

Nico's default build stores no user files. If you extend it (e.g. avatar
uploads), create the bucket with the CLI:

```bash
supabase storage create-bucket avatars --public
```

…and add an RLS policy on `storage.objects` in a new migration.

---

## 6. Environment variables

```bash
cp .env.example .env
# fill in VITE_SUPABASE_*, SUPABASE_*, and LOVABLE_API_KEY
```

See [`.env.example`](../.env.example) for the full list and what each
variable is used for.

---

## 7. Regenerate TypeScript types

```bash
supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

The committed `types.ts` already matches the migrations, so this step is
only needed after you add a migration of your own.

---

## 8. Run the app locally

```bash
bun run dev      # http://localhost:3000
bun run build    # production build → .output/
bun run test     # vitest
```

---

## 9. Android build

See [`ANDROID_BUILD.md`](./ANDROID_BUILD.md). Short version:

```bash
bun run build
bunx cap add android          # first time only
bunx cap sync android
bunx cap open android         # then Build → Generate Signed Bundle
```

`capacitor.config.ts` is already set for a production build (no
`server.url`, `webDir: "dist"`).

---

## 10. Deploy

Any Node/Worker host that runs TanStack Start works: Cloudflare Workers,
Vercel, Netlify, a plain Node server, self-hosted Docker. Set the same
`.env` variables in the host's dashboard. Run `bun run build` and serve
`.output/`.

---

## 11. Verify

- `bun run test` → 30 tests pass.
- Sign up with email → check that a row appears in `public.users`
  automatically (`handle_new_auth_user` trigger).
- Press the mic → say something → Nico transcribes, thinks, and replies.
- Open `/privacy` (signed in) → Export / Wipe / Delete flows work.

If any of these fail, see [`EXPORT_READY.md`](./EXPORT_READY.md) for the
troubleshooting checklist.
