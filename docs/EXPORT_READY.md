# Nico AI — Export Readiness Report

_Final gate before pushing to GitHub and cutting the v1 release._

## TL;DR

**Status: ✅ Ready for export.** The repository builds, tests pass, and
the database schema is fully reproducible from `supabase/migrations/` on
a brand-new Supabase project. No hidden Lovable dependencies remain in
application code.

---

## 1. Migration status

| File                   | Purpose                                                    | Verified |
| ---------------------- | ---------------------------------------------------------- | -------- |
| `20260728131403_*.sql` | Core tables + auth trigger + RLS + grants                  | ✅       |
| `20260728131411_*.sql` | Function hardening (search_path, revoke)                   | ✅       |
| `20260728142135_*.sql` | `voice_sessions`, `voice_preferences`                      | ✅       |
| `20260728142154_*.sql` | Re-hardening after new functions                           | ✅       |
| `20260728145706_*.sql` | `voice_settings`, `device_permissions`, `assistant_events` | ✅       |

All 11 public tables from the live schema are present in migrations. No
ad-hoc SQL was applied outside the migration files.

## 2. Database portability

- `supabase db reset` on a fresh project recreates the entire schema.
- Every `CREATE TABLE` is followed by explicit GRANTs (authenticated +
  service_role) — the app works on Supabase projects that ship without
  default public-schema grants.
- No CHECK constraints reference `now()`; time-sensitive logic lives in
  triggers, so restores don't fail.
- Optional seed file (`supabase/seed.sql`) is empty by default — a clean
  database is a valid starting state (`handle_new_auth_user` populates
  per-user rows on sign-up).

## 3. GitHub readiness

- `.env.example` documents every variable; no secrets are committed.
- `.env` is gitignored (see `.gitignore`).
- `supabase/config.toml` holds only the CLI project ref — safe to publish;
  new contributors override it with `supabase link`.
- No hardcoded Lovable URLs, project IDs, or API keys in `src/`.
  (`capacitor.config.ts` no longer contains the dev preview URL.)
- No dependencies on private Lovable packages beyond the public
  `@lovable.dev/cloud-auth-js`, which is an optional Google OAuth broker;
  the app falls back to `supabase.auth` if you prefer.

## 4. Android readiness

- `capacitor.config.ts`: `appId = com.nico.ai`, `webDir = dist`,
  production settings — no dev server URL.
- `apps/mobile/android/` contains the native templates (manifest additions,
  Kotlin plugin, wake-word foreground service).
- Build guide: [`ANDROID_BUILD.md`](./ANDROID_BUILD.md).
- Manual step: `bunx cap add android` once, then copy the native files
  from `apps/mobile/android/` into the generated Android project.

## 5. Production readiness

| Area    | State                                                              |
| ------- | ------------------------------------------------------------------ |
| Build   | `bun run build` clean, no TS errors                                |
| Tests   | 30/30 passing (`bun run test`)                                     |
| RLS     | Enabled on every user-data table, owner-scoped policies            |
| Secrets | Server-only (`process.env`), never bundled                         |
| Auth    | Email + optional Google; anonymous sign-ups disabled               |
| Voice   | STT/LLM/TTS behind server routes; API keys never touch the browser |
| Offline | LocalStorage cache + command queue with replay-on-reconnect        |
| Privacy | `/privacy` route: export, wipe, delete-account                     |

## 6. Manual steps a new operator must do

1. Create a Supabase project and run `supabase db push`.
2. Enable Email (and optionally Google) in Auth → Providers.
3. Fill in `.env` from `.env.example`.
4. (Optional) Enable **Leaked Password Protection** in Auth settings.
5. (Optional) Swap the AI provider in `src/routes/api/nico/*.ts` if you
   don't want to use `LOVABLE_API_KEY`.
6. (Android only) `bunx cap add android`, copy `apps/mobile/android/*`
   into the generated project, sign, upload.

Nothing else is required. The repo is self-contained.

## 7. Files added for portability this pass

- `supabase/seed.sql`
- `supabase/README.md`
- `.env.example`
- `docs/MIGRATION_GUIDE.md`
- `docs/EXPORT_READY.md` (this file)

No source, migration, or feature file was modified.
