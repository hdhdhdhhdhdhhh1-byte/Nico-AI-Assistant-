# Nico AI — Supabase Project

This folder is the **single source of truth** for the backend. Anyone can
recreate the entire database on a fresh Supabase project with the CLI —
no Lovable, no dashboard clicks.

## Contents

```
supabase/
├── config.toml          # CLI link (project ref)
├── seed.sql             # Optional local seed
└── migrations/          # Ordered, idempotent SQL migrations
    ├── 20260728131403_*.sql   # users, user_profiles, memories,
    │                            conversations, messages, learning_records,
    │                            touch_updated_at(), handle_new_auth_user(),
    │                            on_auth_user_created trigger, RLS + grants
    ├── 20260728131411_*.sql   # Hardening: REVOKE execute + search_path pin
    ├── 20260728142135_*.sql   # voice_sessions, voice_preferences
    ├── 20260728142154_*.sql   # Re-hardening after new functions
    └── 20260728145706_*.sql   # voice_settings, device_permissions,
                                 assistant_events
```

Everything the app needs — schema, indexes, functions, triggers, RLS
policies, grants — is inside `migrations/`. No storage buckets are required
(Nico is voice+text only; audio is streamed, not stored).

## Fresh setup (new Supabase project)

```bash
# 1. Install the CLI
brew install supabase/tap/supabase        # macOS
# or: npm i -g supabase

# 2. Create a project at https://supabase.com/dashboard, then:
supabase login
supabase link --project-ref <YOUR_PROJECT_REF>

# 3. Apply all migrations
supabase db push        # remote project
# or, for a local stack:
supabase start && supabase db reset

# 4. (Optional) regenerate typed client
supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

See [`../docs/MIGRATION_GUIDE.md`](../docs/MIGRATION_GUIDE.md) for the
end-to-end walkthrough (env vars, Google OAuth, running the app).

## Auth expectations

- Email/password enabled.
- Google OAuth (optional): enable in `Authentication → Providers` and set
  the redirect URL to your app origin (e.g. `https://your.app`).
- Anonymous sign-ins: disabled. Guest mode is handled on-device only.

## Adding a new migration

```bash
supabase migration new <name>
# edit supabase/migrations/<timestamp>_<name>.sql
supabase db push
```

Every new `public` table **must** include GRANTs in the same migration —
see any existing migration for the pattern.
