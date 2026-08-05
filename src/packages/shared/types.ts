/**
 * @nico/shared — Cross-package contracts.
 * Every package depends on these types only, never on each other's internals.
 */

export type Locale = "ar" | "en";

export type IntentName =
  | "greeting"
  | "smalltalk"
  | "question"
  | "reminder"
  | "weather"
  | "calendar"
  | "search"
  | "smart_home"
  | "notes"
  | "memory_store"
  | "memory_recall"
  | "call_contact"
  | "send_message"
  | "open_app"
  | "time_date"
  | "unknown";

export interface Intent {
  name: IntentName;
  confidence: number;
  entities: Record<string, string>;
  raw: string;
}

export interface PlanStep {
  id: string;
  skill: string;
  input: Record<string, unknown>;
  description: string;
}

export interface Plan {
  steps: PlanStep[];
  requiresMemory: boolean;
  requiresPermissions: PermissionKey[];
}

export type PermissionKey =
  | "microphone"
  | "location"
  | "files"
  | "camera"
  | "notifications"
  | "background_audio"
  | "bluetooth"
  | "contacts";

export type PermissionState = "granted" | "denied" | "prompt";

export interface ConversationTurn {
  id: string;
  role: "user" | "nico";
  content: string;
  createdAt: number;
  intent?: IntentName;
}

export type MemoryImportance = "low" | "medium" | "high";
export type MemoryRetention = "session" | "short" | "long" | "permanent";
export type MemoryKind = "profile" | "preference" | "habit" | "fact" | "event";

export interface MemoryRecord {
  id: string;
  key: string;
  value: string;
  kind: MemoryKind;
  createdAt: number;
  score: number;
  importance?: MemoryImportance;
  retention?: MemoryRetention;
  expiresAt?: number;
}

export type CommunicationStyle = "concise" | "balanced" | "detailed";

export interface ImportantDate {
  label: string;
  date: string;
}

export interface PersonalityProfile {
  traits: string[];
  tone: "friendly" | "formal" | "playful";
  verbosity: CommunicationStyle;
  respectful: boolean;
}

export interface UserProfileData {
  id: string;
  name?: string;
  preferredName?: string;
  locale: Locale;
  voice: string;
  isGuest: boolean;
  createdAt: number;
  preferences: Record<string, string>;
  interests: string[];
  importantDates: ImportantDate[];
  communicationStyle: CommunicationStyle;
  personality: PersonalityProfile;
}

export interface SkillContext {
  intent: Intent;
  step: PlanStep;
  profile: UserProfileData;
  recall: (query: string) => MemoryRecord[];
  remember: (record: Omit<MemoryRecord, "id" | "createdAt" | "score">) => void;
  hasPermission: (key: PermissionKey) => boolean;
}

export interface SkillResult {
  ok: boolean;
  speech: string;
  data?: Record<string, unknown>;
  error?: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  intents: IntentName[];
  permissions?: PermissionKey[];
  /** Whether the skill is active on first run; user can override. */
  enabledByDefault?: boolean;
  /** Optional grouping shown in the skills settings screen. */
  category?: string;
  version?: string;
  execute(ctx: SkillContext): Promise<SkillResult>;
}

export interface BrainResponse {
  transcript: string;
  intent: Intent;
  plan: Plan;
  speech: string;
  skillResults: SkillResult[];
  memoriesWritten: number;
}

export interface ReminderTask {
  id: string;
  title: string;
  dueAt: number;
  done: boolean;
}
