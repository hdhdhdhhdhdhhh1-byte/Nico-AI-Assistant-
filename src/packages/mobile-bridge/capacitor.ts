/**
 * Capacitor implementation of the existing `MobileBridge` contract.
 *
 * Nothing here knows about NicoBrain — it only gives the same runtime a real
 * phone underneath it. On the web the previously shipped `WebMobileBridge`
 * stays in charge, so no existing surface changes behaviour.
 */
import type {
  AppControlBridge,
  BackgroundServiceBridge,
  MobileBridge,
  NotificationBridge,
  PhoneActionsBridge,
} from "./types";
import { registerMobileBridge } from "./index";

/** True only inside the Android/iOS shell. */
export function isNativePlatform(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

export function nativePlatform(): "android" | "ios" | "web" {
  if (typeof window === "undefined") return "web";
  const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  const p = cap?.getPlatform?.();
  return p === "android" || p === "ios" ? p : "web";
}

/**
 * The wake-word foreground service lives in native code
 * (`apps/mobile/android/VoiceBackgroundService.kt`). When that plugin is not
 * installed yet we degrade to "not running" instead of throwing.
 */
interface NativeVoiceServicePlugin {
  start(options: { wakeWord?: string; foregroundText?: string }): Promise<{ running: boolean }>;
  stop(): Promise<void>;
  isRunning(): Promise<{ running: boolean }>;
  setVolume(options: { level: number }): Promise<void>;
}

function voiceServicePlugin(): NativeVoiceServicePlugin | undefined {
  if (typeof window === "undefined") return undefined;
  return (
    window as unknown as {
      Capacitor?: { Plugins?: { NicoVoiceService?: NativeVoiceServicePlugin } };
    }
  ).Capacitor?.Plugins?.NicoVoiceService;
}

class CapacitorBackgroundService implements BackgroundServiceBridge {
  private running = false;

  async start(options: { wakeWord?: string; foregroundText?: string } = {}) {
    const plugin = voiceServicePlugin();
    if (!plugin) {
      this.running = false;
      return false;
    }
    try {
      const res = await plugin.start({
        wakeWord: options.wakeWord ?? "يا نيكو",
        foregroundText: options.foregroundText ?? "نيكو جاهز — قل «يا نيكو»",
      });
      this.running = Boolean(res?.running);
    } catch {
      this.running = false;
    }
    return this.running;
  }

  async stop() {
    this.running = false;
    try {
      await voiceServicePlugin()?.stop();
    } catch {
      /* service already gone */
    }
  }

  async isRunning() {
    try {
      const res = await voiceServicePlugin()?.isRunning();
      this.running = Boolean(res?.running);
    } catch {
      /* keep last known state */
    }
    return this.running;
  }
}

class CapacitorNotifications implements NotificationBridge {
  async requestPermission() {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const res = await LocalNotifications.requestPermissions();
      return res.display === "granted" ? ("granted" as const) : ("denied" as const);
    } catch {
      return "denied" as const;
    }
  }

  async notify({ title, body, at, id }: { title: string; body: string; at?: number; id?: string }) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      await LocalNotifications.schedule({
        notifications: [
          {
            id: hashId(id),
            title,
            body,
            schedule: at ? { at: new Date(at) } : undefined,
          },
        ],
      });
    } catch {
      /* notifications unavailable */
    }
  }

  async cancel(id: string) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      await LocalNotifications.cancel({ notifications: [{ id: hashId(id) }] });
    } catch {
      /* nothing scheduled */
    }
  }
}

/** Local notifications need a numeric id; derive a stable one from the string. */
function hashId(id?: string): number {
  if (!id) return Math.floor(Math.random() * 100000) + 1;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h % 100000) + 1;
}

class CapacitorPhoneActions implements PhoneActionsBridge {
  async call(number: string) {
    if (typeof window !== "undefined") window.location.href = `tel:${number}`;
  }
  async sendSms(number: string, message: string) {
    if (typeof window !== "undefined") {
      window.location.href = `sms:${number}?body=${encodeURIComponent(message)}`;
    }
  }
  async pickContact() {
    try {
      const { Contacts } = await import("@capacitor-community/contacts");
      const res = await Contacts.pickContact({
        projection: {
          name: true,
          phones: true,
        },
      });
      return {
        name: res.contact.name?.display || "Unknown",
        number: res.contact.phones?.[0]?.number,
      };
    } catch {
      return null;
    }
  }
}

class CapacitorAppControl implements AppControlBridge {
  async openApp(packageName: string) {
    if (typeof window === "undefined") return false;
    try {
      window.location.href = `intent://#Intent;package=${packageName};end`;
      return true;
    } catch {
      return false;
    }
  }
  async openUrl(url: string) {
    if (typeof window !== "undefined") window.open(url, "_blank", "noopener");
  }
  async setVolume(level: number) {
    try {
      await voiceServicePlugin()?.setVolume({ level });
    } catch {
      /* fail silently if plugin not registered */
    }
  }
}

export class CapacitorMobileBridge implements MobileBridge {
  readonly platform = nativePlatform() === "ios" ? ("ios" as const) : ("android" as const);
  readonly available = true;
  background = new CapacitorBackgroundService();
  notifications = new CapacitorNotifications();
  phone = new CapacitorPhoneActions();
  apps = new CapacitorAppControl();
}

let installed = false;

/** Installs the native bridge once, only when running inside the app shell. */
export function installCapacitorBridge(): boolean {
  if (installed || !isNativePlatform()) return installed;
  registerMobileBridge(new CapacitorMobileBridge());
  installed = true;
  return true;
}
