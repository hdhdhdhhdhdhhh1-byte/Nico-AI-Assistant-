import type { PermissionKey, Skill } from "../shared/types";
import type { PermissionManager } from "./PermissionManager";
import { RateLimiter } from "./RateLimiter";

export interface SecurityDecision {
  allowed: boolean;
  missing: PermissionKey[];
  reason?: string;
}

/**
 * Security Layer — the guard between the planner and any skill execution.
 *
 *  - Permission validation (default-deny for sensitive capabilities).
 *  - Rate limiting per skill to contain runaway loops.
 *  - User data isolation checks for anything leaving the device.
 *  - Redaction of sensitive spans before text reaches a model.
 */
export class SecurityLayer {
  constructor(
    private readonly permissions: PermissionManager,
    private readonly limiter = new RateLimiter(30, 60_000),
  ) {}

  authorize(skill: Skill): SecurityDecision {
    const missing = (skill.permissions ?? []).filter((p) => !this.permissions.isGranted(p));
    if (missing.length) return { allowed: false, missing, reason: "permission_denied" };
    const gate = this.limiter.check(`skill:${skill.id}`);
    if (!gate.allowed) return { allowed: false, missing: [], reason: "rate_limited" };
    return { allowed: true, missing: [] };
  }

  /**
   * Data isolation: a record may only be read or written by its owner.
   * Guest records (no owner) stay on-device and never sync.
   */
  ownsRecord(currentUserId: string | null, recordUserId: string | null | undefined): boolean {
    if (!recordUserId) return currentUserId === null;
    return !!currentUserId && currentUserId === recordUserId;
  }

  /** Throws when a caller tries to touch another user's row. */
  assertOwnership(currentUserId: string | null, recordUserId: string | null | undefined) {
    if (!this.ownsRecord(currentUserId, recordUserId)) {
      throw new Error("access_denied: record belongs to another user");
    }
  }

  /** Guest data must never be pushed to the cloud without an upgrade. */
  canSync(isGuest: boolean): boolean {
    return !isGuest;
  }

  /** Strips anything that must never leave the device into an LLM prompt. */
  sanitizeForModel(text: string): string {
    return text
      .replace(/\b\d{13,19}\b/g, "[رقم محجوب]")
      .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[بريد محجوب]")
      .replace(/\b(?:\+?\d[\d\s-]{8,14}\d)\b/g, "[هاتف محجوب]")
      .replace(/\b(?:sk|pk|sb|ghp)_[A-Za-z0-9_-]{8,}\b/g, "[مفتاح محجوب]");
  }
}
