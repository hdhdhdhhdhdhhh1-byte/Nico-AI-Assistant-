import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Ensure a `public.users` row exists for the signed-in auth user. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureUserId(supabase: any, authId: string): Promise<string> {
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", authId)
    .maybeSingle();
  if (existing?.id) {
    await supabase
      .from("users")
      .update({ last_active: new Date().toISOString() })
      .eq("id", existing.id);
    return existing.id as string;
  }
  const { data: created, error } = await supabase
    .from("users")
    .insert({ auth_id: authId })
    .select("id")
    .single();
  if (error) throw error;
  await supabase.from("user_profiles").insert({ user_id: created.id });
  return created.id as string;
}

export const getBootstrap = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = await ensureUserId(context.supabase, context.userId);
    const [{ data: profile }, { data: memories }, { data: conversations }] = await Promise.all([
      context.supabase.from("user_profiles").select("*").eq("user_id", userId).maybeSingle(),
      context.supabase
        .from("memories")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(200),
      context.supabase
        .from("conversations")
        .select("id, title, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(20),
    ]);
    return { userId, profile, memories: memories ?? [], conversations: conversations ?? [] };
  });

export const saveMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        key: z.string().optional(),
        content: z.string().min(1).max(4000),
        type: z.string().default("fact"),
        importance: z.enum(["low", "medium", "high"]).default("medium"),
        retention: z.enum(["session", "short", "long", "permanent"]).default("long"),
        confirmed: z.boolean().default(true),
      })
      .parse(i),
  )
  .handler(async ({ context, data }) => {
    const userId = await ensureUserId(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("memories")
      .insert({ user_id: userId, ...data })
      .select()
      .single();
    if (error) throw error;
    return row;
  });

export const deleteMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("memories").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const searchMemories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({ query: z.string().min(1).max(200), limit: z.number().default(10) }).parse(i),
  )
  .handler(async ({ context, data }) => {
    const userId = await ensureUserId(context.supabase, context.userId);
    const { data: rows } = await context.supabase
      .from("memories")
      .select("*")
      .eq("user_id", userId)
      .ilike("content", `%${data.query}%`)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    return rows ?? [];
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        preferred_name: z.string().optional(),
        language: z.string().optional(),
        communication_style: z.string().optional(),
        personality_settings: z.record(z.any()).optional(),
        preferences: z.record(z.any()).optional(),
        interests: z.array(z.any()).optional(),
        important_dates: z.array(z.any()).optional(),
      })
      .parse(i),
  )
  .handler(async ({ context, data }) => {
    const userId = await ensureUserId(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("user_profiles")
      .update(data)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw error;
    return row;
  });

export const ensureConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({ id: z.string().uuid().optional(), title: z.string().optional() }).parse(i),
  )
  .handler(async ({ context, data }) => {
    const userId = await ensureUserId(context.supabase, context.userId);
    if (data.id) {
      const { data: row } = await context.supabase
        .from("conversations")
        .select("id")
        .eq("id", data.id)
        .maybeSingle();
      if (row) return row;
    }
    const { data: created, error } = await context.supabase
      .from("conversations")
      .insert({ user_id: userId, title: data.title ?? null })
      .select("id")
      .single();
    if (error) throw error;
    return created;
  });

export const saveMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        conversation_id: z.string().uuid(),
        role: z.enum(["user", "nico"]),
        content: z.string().min(1),
        intent: z.string().optional(),
        voice_metadata: z.record(z.any()).optional(),
      })
      .parse(i),
  )
  .handler(async ({ context, data }) => {
    const userId = await ensureUserId(context.supabase, context.userId);
    const { error } = await context.supabase.from("messages").insert({ user_id: userId, ...data });
    if (error) throw error;
    await context.supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", data.conversation_id);
    return { ok: true };
  });

export const saveLearning = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        signal_type: z.string(),
        correction: z.string().optional(),
        learned_preference: z.record(z.any()).optional(),
        confidence: z.number().min(0).max(1).default(0.5),
      })
      .parse(i),
  )
  .handler(async ({ context, data }) => {
    const userId = await ensureUserId(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("learning_records")
      .insert({ user_id: userId, ...data });
    if (error) throw error;
    return { ok: true };
  });

export const updateMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        id: z.string().uuid(),
        content: z.string().min(1).max(4000).optional(),
        key: z.string().optional(),
        importance: z.enum(["low", "medium", "high"]).optional(),
        retention: z.enum(["session", "short", "long", "permanent"]).optional(),
      })
      .parse(i),
  )
  .handler(async ({ context, data }) => {
    const { id, ...patch } = data;
    const { data: row, error } = await context.supabase
      .from("memories")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return row;
  });

export const deleteAllMemories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = await ensureUserId(context.supabase, context.userId);
    const { error } = await context.supabase.from("memories").delete().eq("user_id", userId);
    if (error) throw error;
    return { ok: true };
  });

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = await ensureUserId(context.supabase, context.userId);
    const { data } = await context.supabase
      .from("conversations")
      .select("id, title, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(100);
    return data ?? [];
  });

export const listMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ conversation_id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    const { data: rows } = await context.supabase
      .from("messages")
      .select("id, role, content, intent, created_at")
      .eq("conversation_id", data.conversation_id)
      .order("created_at", { ascending: true });
    return rows ?? [];
  });

export const listLearning = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = await ensureUserId(context.supabase, context.userId);
    const { data } = await context.supabase
      .from("learning_records")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200);
    return data ?? [];
  });

export const deleteLearning = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("learning_records").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const exportData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = await ensureUserId(context.supabase, context.userId);
    const [profile, memories, conversations, messages, learning] = await Promise.all([
      context.supabase.from("user_profiles").select("*").eq("user_id", userId).maybeSingle(),
      context.supabase.from("memories").select("*").eq("user_id", userId),
      context.supabase.from("conversations").select("*").eq("user_id", userId),
      context.supabase.from("messages").select("*").eq("user_id", userId),
      context.supabase.from("learning_records").select("*").eq("user_id", userId),
    ]);
    return {
      exported_at: new Date().toISOString(),
      profile: profile.data,
      memories: memories.data ?? [],
      conversations: conversations.data ?? [],
      messages: messages.data ?? [],
      learning: learning.data ?? [],
    };
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const authId = context.userId;
    const { data: userRow } = await context.supabase
      .from("users")
      .select("id")
      .eq("auth_id", authId)
      .maybeSingle();
    if (userRow?.id) {
      await context.supabase.from("users").delete().eq("id", userRow.id);
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.auth.admin.deleteUser(authId);
    return { ok: true };
  });

/* ── Phase 6: voice sessions & voice preferences ─────────────────────────── */

export const saveVoiceSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        conversation_id: z.string().uuid().optional(),
        duration: z.number().min(0).max(3600).default(0),
        language: z.string().max(12).default("ar"),
        confidence: z.number().min(0).max(1).optional(),
      })
      .parse(i),
  )
  .handler(async ({ context, data }) => {
    const userId = await ensureUserId(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("voice_sessions")
      .insert({ user_id: userId, ...data })
      .select()
      .single();
    if (error) throw error;
    return row;
  });

export const listVoiceSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = await ensureUserId(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("voice_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data ?? [];
  });

export const getVoicePreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = await ensureUserId(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("voice_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  });

export const saveVoicePreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        voice_name: z.string().min(1).max(40),
        speed: z.number().min(0.5).max(2),
        tone: z.enum(["friendly", "calm", "energetic", "formal"]),
        language: z.enum(["ar", "en"]),
      })
      .parse(i),
  )
  .handler(async ({ context, data }) => {
    const userId = await ensureUserId(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("voice_preferences")
      .upsert({ user_id: userId, ...data }, { onConflict: "user_id" })
      .select()
      .single();
    if (error) throw error;
    return row;
  });

/* ── Phase 7: voice settings, device permissions & assistant events ──────── */

export const getVoiceSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = await ensureUserId(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("voice_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  });

export const saveVoiceSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        voice_id: z.string().min(1).max(40).optional(),
        speed: z.number().min(0.5).max(2).optional(),
        pitch: z.number().min(0.5).max(2).optional(),
        style: z.enum(["friendly", "calm", "energetic", "formal"]).optional(),
        language: z.enum(["ar", "en"]).optional(),
        wake_word: z.string().min(1).max(40).optional(),
        wake_word_enabled: z.boolean().optional(),
        auto_greeting: z.boolean().optional(),
        always_ready: z.boolean().optional(),
      })
      .parse(i),
  )
  .handler(async ({ context, data }) => {
    const userId = await ensureUserId(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("voice_settings")
      .upsert({ user_id: userId, ...data }, { onConflict: "user_id" })
      .select()
      .single();
    if (error) throw error;
    return row;
  });

export const listDevicePermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = await ensureUserId(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("device_permissions")
      .select("*")
      .eq("user_id", userId);
    if (error) throw error;
    return data ?? [];
  });

export const saveDevicePermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        permission: z.string().min(1).max(40),
        status: z.enum(["granted", "denied", "prompt"]),
        platform: z.string().max(20).default("web"),
        device_label: z.string().max(120).optional(),
      })
      .parse(i),
  )
  .handler(async ({ context, data }) => {
    const userId = await ensureUserId(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("device_permissions")
      .upsert({ user_id: userId, ...data }, { onConflict: "user_id,permission,platform" });
    if (error) throw error;
    return { ok: true };
  });

export const logAssistantEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        event_type: z.string().min(1).max(60),
        detail: z.string().max(500).optional(),
        metadata: z.record(z.any()).optional(),
      })
      .parse(i),
  )
  .handler(async ({ context, data }) => {
    const userId = await ensureUserId(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("assistant_events")
      .insert({ user_id: userId, ...data });
    if (error) throw error;
    return { ok: true };
  });

export const listAssistantEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = await ensureUserId(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("assistant_events")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return data ?? [];
  });
