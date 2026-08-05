/**
 * UserPlan — Offline User Plan Architecture.
 * Manages Free vs Premium feature entitlements on-device without external payment gates.
 */

export type PlanType = "free" | "premium";

export interface PlanFeatureLimits {
  offlineEngine: boolean;
  voiceSpeedControl: boolean;
  customWakeWords: boolean;
  unlimitedMemories: boolean;
  ocrProcessing: boolean;
  pdfSummarization: boolean;
}

export class UserPlanManager {
  private static currentPlan: PlanType = "free";

  static getPlan(): PlanType {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("nico_user_plan") as PlanType;
      if (stored === "free" || stored === "premium") {
        this.currentPlan = stored;
      }
    }
    return this.currentPlan;
  }

  static setPlan(plan: PlanType) {
    this.currentPlan = plan;
    if (typeof window !== "undefined") {
      localStorage.setItem("nico_user_plan", plan);
    }
  }

  static getEntitlements(): PlanFeatureLimits {
    const plan = this.getPlan();
    return {
      offlineEngine: true, // Always free & available offline
      voiceSpeedControl: true,
      customWakeWords: plan === "premium",
      unlimitedMemories: plan === "premium",
      ocrProcessing: plan === "premium",
      pdfSummarization: plan === "premium",
    };
  }

  static isFeatureAllowed(feature: keyof PlanFeatureLimits): boolean {
    const entitlements = this.getEntitlements();
    return entitlements[feature] ?? false;
  }
}
