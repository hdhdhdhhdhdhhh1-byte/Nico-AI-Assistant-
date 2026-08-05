/**
 * Central input schemas for Nico's server functions and API routes.
 * Zod is already a transitive dep; if not exposed, callers should still
 * apply the shape rules described here.
 */
import { z } from "zod";

export const transcribeSchema = z.object({
  audio: z
    .string()
    .min(1)
    .max(20 * 1024 * 1024),
  mime: z.string().max(64).optional(),
  language: z.enum(["ar", "en"]).default("ar"),
});

export const thinkSchema = z.object({
  transcript: z.string().trim().min(1).max(4000),
  language: z.enum(["ar", "en"]).default("ar"),
  context: z.string().max(8000).optional(),
});

export const speakSchema = z.object({
  text: z.string().trim().min(1).max(4000),
  voice: z.string().max(64).optional(),
  speed: z.number().min(0.5).max(2).optional(),
});

export const memorySchema = z.object({
  key: z.string().max(120).optional(),
  content: z.string().trim().min(1).max(4000),
  type: z.string().max(40).optional(),
  importance: z.enum(["low", "medium", "high"]).optional(),
  retention: z.enum(["session", "short", "long", "permanent"]).optional(),
});

export const messageSchema = z.object({
  conversation_id: z.string().uuid(),
  role: z.enum(["user", "nico"]),
  content: z.string().trim().min(1).max(8000),
  intent: z.string().max(60).optional(),
  voice_metadata: z.record(z.unknown()).optional(),
});

export type TranscribeInput = z.infer<typeof transcribeSchema>;
export type ThinkInput = z.infer<typeof thinkSchema>;
export type SpeakInput = z.infer<typeof speakSchema>;
export type MemoryInput = z.infer<typeof memorySchema>;
export type MessageInput = z.infer<typeof messageSchema>;
