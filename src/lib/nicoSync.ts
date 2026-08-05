/**
 * Client-side persistence bridge between the in-memory Nico runtime and
 * the Lovable Cloud database. Called from useNico whenever the user is
 * authenticated. When signed out, callers are no-ops and everything stays
 * in-process (the existing Guest experience).
 */
import {
  deleteAccount,
  deleteAllMemories,
  deleteLearning,
  deleteMemory,
  ensureConversation,
  exportData,
  getVoicePreferences,
  getVoiceSettings,
  saveVoiceSettings,
  listDevicePermissions,
  saveDevicePermission,
  logAssistantEvent,
  listAssistantEvents,
  listVoiceSessions,
  saveVoicePreferences,
  saveVoiceSession,
  getBootstrap,
  listConversations,
  listLearning,
  listMessages,
  saveLearning,
  saveMemory,
  saveMessage,
  searchMemories,
  updateMemory,
  updateProfile,
} from "./nico.functions";

export type SaveMemoryInput = {
  key?: string;
  content: string;
  type?: string;
  importance?: "low" | "medium" | "high";
  retention?: "session" | "short" | "long" | "permanent";
  confirmed?: boolean;
};

export type SaveMessageInput = {
  conversation_id: string;
  role: "user" | "nico";
  content: string;
  intent?: string;
  voice_metadata?: Record<string, unknown>;
};

export type UpdateProfileInput = {
  preferred_name?: string;
  language?: string;
  communication_style?: string;
  personality_settings?: Record<string, unknown>;
  preferences?: Record<string, unknown>;
  interests?: unknown[];
  important_dates?: unknown[];
};

export type SaveLearningInput = {
  signal_type: string;
  correction?: string;
  learned_preference?: Record<string, unknown>;
  confidence?: number;
};

export type SaveVoiceSessionInput = {
  conversation_id?: string;
  duration?: number;
  language?: string;
  confidence?: number;
};

export type VoicePreferencesInput = {
  voice_name: string;
  speed: number;
  tone: "friendly" | "calm" | "energetic" | "formal";
  language: "ar" | "en";
};

export type VoiceSettingsInput = {
  voice_id?: string;
  speed?: number;
  pitch?: number;
  style?: "friendly" | "calm" | "energetic" | "formal";
  language?: "ar" | "en";
  wake_word?: string;
  wake_word_enabled?: boolean;
  auto_greeting?: boolean;
  always_ready?: boolean;
};

export type DevicePermissionInput = {
  permission: string;
  status: "granted" | "denied" | "prompt";
  platform?: string;
  device_label?: string;
};

export type AssistantEventInput = {
  event_type: string;
  detail?: string;
  metadata?: Record<string, unknown>;
};

export const nicoSync = {
  getVoiceSettings: () => getVoiceSettings(),
  saveVoiceSettings: (data: VoiceSettingsInput) => saveVoiceSettings({ data }),
  listDevicePermissions: () => listDevicePermissions(),
  saveDevicePermission: (data: DevicePermissionInput) =>
    saveDevicePermission({ data: { platform: "web", ...data } }),
  logEvent: (data: AssistantEventInput) => logAssistantEvent({ data }),
  listAssistantEvents: () => listAssistantEvents(),
  saveVoiceSession: (data: SaveVoiceSessionInput) => saveVoiceSession({ data }),
  listVoiceSessions: () => listVoiceSessions(),
  getVoicePreferences: () => getVoicePreferences(),
  saveVoicePreferences: (data: VoicePreferencesInput) => saveVoicePreferences({ data }),
  bootstrap: () => getBootstrap(),
  saveMemory: (data: SaveMemoryInput) => saveMemory({ data }),
  deleteMemory: (id: string) => deleteMemory({ data: { id } }),
  searchMemories: (query: string, limit = 10) => searchMemories({ data: { query, limit } }),
  updateProfile: (data: UpdateProfileInput) => updateProfile({ data }),
  ensureConversation: (id?: string, title?: string) => ensureConversation({ data: { id, title } }),
  saveMessage: (data: SaveMessageInput) => saveMessage({ data }),
  saveLearning: (data: SaveLearningInput) => saveLearning({ data }),
  updateMemory: (
    id: string,
    patch: Partial<Pick<SaveMemoryInput, "content" | "key" | "importance" | "retention">>,
  ) => updateMemory({ data: { id, ...patch } }),
  deleteAllMemories: () => deleteAllMemories(),
  listConversations: () => listConversations(),
  listMessages: (conversation_id: string) => listMessages({ data: { conversation_id } }),
  listLearning: () => listLearning(),
  deleteLearning: (id: string) => deleteLearning({ data: { id } }),
  exportData: () => exportData(),
  deleteAccount: () => deleteAccount(),
};
