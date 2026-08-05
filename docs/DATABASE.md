# Nico AI — Database Reference

كل الجداول في `public`، مفعّلة RLS، ومقيّدة عبر جدول `users` (جسر بين
`auth.users.id` والمعرّف الداخلي).

## الجداول

| الجدول               | الغرض                                    | حقول مفتاحية                       |
| -------------------- | ---------------------------------------- | ---------------------------------- |
| `users`              | جسر `auth.users` ↔ RLS                   | `auth_id`, `guest_id`              |
| `user_profiles`      | الاسم، اللغة، أسلوب التواصل، التفضيلات   | `preferences`, `interests`         |
| `voice_preferences`  | صوت افتراضي + سرعة + نبرة                | —                                  |
| `voice_settings`     | wake-word + auto-greeting + always-ready | —                                  |
| `voice_sessions`     | مدة/لغة/ثقة لكل جلسة                     | —                                  |
| `conversations`      | عنوان + updated_at                       | —                                  |
| `messages`           | رسائل + voice_metadata                   | `conversation_id`, `role`          |
| `memories`           | LTM: حقائق/تفضيلات/عادات                 | `type`, `importance`, `retention`  |
| `learning_records`   | إشارات التعلّم                           | `signal_type`, `confidence`        |
| `device_permissions` | حالة كل إذن لكل جهاز                     | `permission`, `status`, `platform` |
| `assistant_events`   | Telemetry داخلي                          | `event_type`                       |

## RLS Pattern

```sql
USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
```

`users` نفسه: `auth_id = auth.uid()`.

## Triggers / Functions

- `handle_new_auth_user()` — على `auth.users` INSERT ينشئ `users` +
  `user_profiles`.
- `touch_updated_at()` — يحدّث `updated_at`.

## Grants

كل جدول:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.<t> TO authenticated;
GRANT ALL ON public.<t> TO service_role;
```

لا `anon` — لا قراءات عامة.

## Export / Delete

- تصدير: `exportData()` server fn → JSON كامل.
- حذف: `deleteAllMemories()` / `deleteAccount()` (يستدعي
  `auth.admin.deleteUser`).
