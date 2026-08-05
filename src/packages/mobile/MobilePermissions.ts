/**
 * MobilePermissions — phone-side, just-in-time permission handling.
 *
 * It wraps (never replaces) the existing `PermissionManager`: the stored
 * decision, the spoken reason and the intent → permission mapping all stay
 * where they are. On a real device the OS prompt is asked through Capacitor;
 * on the web everything falls back to the browser prompts already shipped.
 */
import type { PermissionKey, PermissionState } from "../shared/types";
import type { PermissionManager } from "../permissions/PermissionManager";
import { isNativePlatform } from "../mobile-bridge/capacitor";
import { mobileBridge } from "../mobile-bridge";

/** Permissions the phone app may ask for, in the order the user meets them. */
export const MOBILE_PERMISSIONS: PermissionKey[] = [
  "microphone",
  "notifications",
  "location",
  "bluetooth",
  "background_audio",
];

/** Only these two are asked during onboarding; the rest are asked on demand. */
export const ONBOARDING_PERMISSIONS: PermissionKey[] = ["microphone", "notifications"];

export class MobilePermissions {
  constructor(private readonly base: PermissionManager) {}

  snapshot() {
    return this.base.snapshot();
  }

  isGranted(key: PermissionKey) {
    return this.base.isGranted(key);
  }

  reason(key: PermissionKey) {
    return this.base.reason(key);
  }

  /** Ask the OS (native) or the browser (web), then record the decision. */
  async request(key: PermissionKey): Promise<PermissionState> {
    if (!isNativePlatform()) return this.base.request(key);

    if (key === "notifications") {
      const res = await mobileBridge().notifications.requestPermission();
      const mapped: PermissionState = res === "granted" ? "granted" : "denied";
      this.base.set(key, mapped);
      return mapped;
    }

    if (key === "location") {
      try {
        const { Geolocation } = await import("@capacitor/geolocation");
        const res = await Geolocation.requestPermissions();
        const granted = res.location === "granted" || res.coarseLocation === "granted";
        this.base.set(key, granted ? "granted" : "denied");
        return granted ? "granted" : "denied";
      } catch {
        this.base.set(key, "denied");
        return "denied";
      }
    }

    // Microphone goes through getUserMedia inside the WebView, which triggers
    // the Android RECORD_AUDIO prompt; everything else keeps the stored consent.
    return this.base.request(key);
  }

  /** Never re-asks something already granted. */
  async ensure(key: PermissionKey): Promise<PermissionState> {
    if (this.base.isGranted(key)) return "granted";
    return this.request(key);
  }

  revoke(key: PermissionKey) {
    this.base.revoke(key);
  }
}
