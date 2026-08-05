/**
 * @nico/shared — Agent-layer contracts (conversation, intent, planning,
 * reasoning, response). Kept separate from `types.ts` so the original
 * contracts stay untouched and every package still depends on types only.
 */

import type { Intent, IntentName, PermissionKey, PlanStep, SkillResult } from "./types";

/** High-level classification of what the user is trying to do. */
export type RequestCategory =
  | "question"
  | "command"
  | "reminder"
  | "search"
  | "personal_info"
  | "task_execution"
  | "conversation";

/** Intent enriched by the advanced intent engine. */
export interface RichIntent extends Intent {
  category: RequestCategory;
  /** Sub-requests when the utterance contains more than one ask. */
  segments: string[];
  /** True when the utterance points at earlier context ("do it again"). */
  isReference: boolean;
}

/** A topic Nico is currently tracking inside a session. */
export interface Topic {
  id: string;
  label: string;
  intent: IntentName;
  entities: Record<string, string>;
  turns: number;
  lastSeenAt: number;
}

export interface ResolvedReference {
  /** Utterance after references were expanded with context. */
  text: string;
  resolved: boolean;
  /** What the reference was expanded from. */
  source?: "topic" | "last_action" | "memory_hint";
  note?: string;
}

export interface ConversationContextSnapshot {
  sessionId: string;
  activeTopic?: Topic;
  topics: Topic[];
  lastUserUtterance?: string;
  lastAction?: { skill: string; input: Record<string, unknown>; at: number };
  slots: Record<string, string>;
}

export interface SessionInfo {
  id: string;
  startedAt: number;
  lastActivityAt: number;
  turns: number;
  isGuest: boolean;
}

/** One node of a multi-step plan produced by the TaskPlanner. */
export interface AgentPlanStep extends PlanStep {
  order: number;
  category: RequestCategory;
  /** Ids of steps that must complete first. */
  dependsOn: string[];
  requiresPermissions: PermissionKey[];
  optional: boolean;
}

export interface AgentPlan {
  id: string;
  goal: string;
  steps: AgentPlanStep[];
  requiresMemory: boolean;
  requiresPermissions: PermissionKey[];
}

export type ResponseStyle = "brief" | "informative" | "confirming" | "empathetic" | "playful";

export interface ReasoningDecision {
  plan: AgentPlan;
  /** Steps cleared to run, in execution order. */
  executable: AgentPlanStep[];
  /** Steps blocked by missing permissions. */
  blocked: { step: AgentPlanStep; missing: PermissionKey[] }[];
  needsMemoryRecall: boolean;
  needsMemoryWrite: boolean;
  needsModel: boolean;
  style: ResponseStyle;
  rationale: string[];
}

export interface ExecutionRecord {
  stepId: string;
  skill: string;
  result: SkillResult;
}

export interface AgentTrace {
  sessionId: string;
  reference: ResolvedReference;
  intent: RichIntent;
  decision: ReasoningDecision;
  executions: ExecutionRecord[];
  memoriesWritten: number;
  durationMs: number;
}
