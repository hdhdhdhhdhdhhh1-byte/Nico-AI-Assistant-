import { VoiceSessionManager, type VoiceState, type VoiceSession } from "./VoiceSessionManager";

export type { VoiceState, VoiceSession };

/**
 * VoiceManager — the UI-facing entry point for the voice loop.
 * Kept as the stable name used across the app; the session lifecycle,
 * metadata capture, wake word and offline cache live in VoiceSessionManager.
 */
export class VoiceManager extends VoiceSessionManager {}
