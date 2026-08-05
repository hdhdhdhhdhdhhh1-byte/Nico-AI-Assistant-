import type { PermissionKey, PermissionState } from "../shared/types";

const KEY = "nico.permissions.v1";

const DEFAULTS: Record<PermissionKey, PermissionState> = {
  microphone: "prompt",
  location: "prompt",
  files: "prompt",
  camera: "prompt",
  notifications: "prompt",
  background_audio: "prompt",
  bluetooth: "prompt",
  contacts: "prompt",
};

/** Spoken reason shown/said the moment a capability is actually needed. */
export const PERMISSION_REASONS: Record<PermissionKey, string> = {
  microphone: "الميكروفون — حتى أسمعك عندما تتحدث",
  location: "الموقع — لأخبرك بالطقس أو أدلّك على الطريق",
  contacts: "جهات الاتصال — عندما تطلب مني الاتصال بأحد",
  notifications: "الإشعارات — لأذكّرك في وقتها",
  camera: "الكاميرا — عند تصوير شيء تريد أن أراه",
  files: "الملفات — عند فتح أو حفظ ملف لك",
  background_audio: "الاستماع في الخلفية — لأبقى جاهزاً لكلمة «يا نيكو»",
  bluetooth: "البلوتوث — للتحكم بأجهزتك القريبة",
};

/** Which capability an intent needs, so nothing is requested up front. */
export const INTENT_PERMISSIONS: Record<string, PermissionKey> = {
  weather: "location",
  navigation: "location",
  location: "location",
  call: "contacts",
  contact: "contacts",
  reminder: "notifications",
  calendar: "notifications",
  smart_home: "bluetooth",
};

/** Explicit, revocable consent for every sensitive capability. */

export class PermissionManager {
  private state: Record<PermissionKey, PermissionState> = { ...DEFAULTS };
  private listeners = new Set<(s: Record<PermissionKey, PermissionState>) => void>();

  constructor() {
    // Intentionally empty constructor for SSR and client hydration consistency
  }

  hydrate() {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        this.state = { ...this.state, ...JSON.parse(raw) };
        this.listeners.forEach((l) => l(this.snapshot()));
      }
    } catch {
      /* ignore */
    }
  }

  snapshot() {
    return { ...this.state };
  }

  isGranted(key: PermissionKey) {
    return this.state[key] === "granted";
  }

  set(key: PermissionKey, value: PermissionState) {
    this.state = { ...this.state, [key]: value };
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(KEY, JSON.stringify(this.state));
      } catch {
        /* ignore */
      }
    }
    this.listeners.forEach((l) => l(this.snapshot()));
  }

  /** Requests the OS-level grant when one exists, then records the decision. */
  async request(key: PermissionKey): Promise<PermissionState> {
    if (key === "microphone" && typeof navigator !== "undefined") {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        this.set("microphone", "granted");
        return "granted";
      } catch {
        this.set("microphone", "denied");
        return "denied";
      }
    }
    if (key === "notifications" && typeof Notification !== "undefined") {
      const res = await Notification.requestPermission();
      const mapped: PermissionState = res === "granted" ? "granted" : "denied";
      this.set("notifications", mapped);
      return mapped;
    }
    if (key === "location" && typeof navigator !== "undefined" && navigator.geolocation) {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => {
            this.set("location", "granted");
            resolve("granted");
          },
          () => {
            this.set("location", "denied");
            resolve("denied");
          },
        );
      });
    }
    if (key === "bluetooth") {
      const bt = (
        navigator as unknown as { bluetooth?: { requestDevice: (o: unknown) => Promise<unknown> } }
      ).bluetooth;
      if (!bt) {
        this.set("bluetooth", "denied");
        return "denied";
      }
      try {
        await bt.requestDevice({ acceptAllDevices: true });
        this.set("bluetooth", "granted");
        return "granted";
      } catch {
        this.set("bluetooth", "denied");
        return "denied";
      }
    }
    if (key === "contacts") {
      const contacts = (
        navigator as unknown as {
          contacts?: { select: (p: string[], o?: unknown) => Promise<unknown> };
        }
      ).contacts;
      if (!contacts) {
        this.set("contacts", "denied");
        return "denied";
      }
      try {
        await contacts.select(["name"], { multiple: false });
        this.set("contacts", "granted");
        return "granted";
      } catch {
        this.set("contacts", "denied");
        return "denied";
      }
    }
    // background_audio (and any future capability) has no OS prompt on the web:
    // it is a stored user consent that gates the feature.
    this.set(key, "granted");
    return "granted";
  }

  /**
   * Just-in-time consent: only asks when the feature is being used, and only
   * if it was never granted before.
   */
  async ensure(key: PermissionKey): Promise<PermissionState> {
    if (this.isGranted(key)) return "granted";
    return this.request(key);
  }

  /** Resolves the capability an intent needs, if any. */
  static permissionForIntent(intent?: string | null): PermissionKey | null {
    if (!intent) return null;
    return INTENT_PERMISSIONS[intent] ?? null;
  }

  reason(key: PermissionKey) {
    return PERMISSION_REASONS[key];
  }

  revoke(key: PermissionKey) {
    this.set(key, "denied");
  }

  subscribe(fn: (s: Record<PermissionKey, PermissionState>) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}
