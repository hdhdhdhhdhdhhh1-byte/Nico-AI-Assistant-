import type {
  AppControlBridge,
  BackgroundServiceBridge,
  MobileBridge,
  NotificationBridge,
  PhoneActionsBridge,
} from "./types";

export * from "./types";

/**
 * Web implementation. Does whatever the browser genuinely supports and reports
 * `available: false` so callers can degrade gracefully (e.g. tell the user a
 * feature needs the Android app).
 */
class WebBackgroundService implements BackgroundServiceBridge {
  private running = false;
  async start() {
    // No true background service on the web; a page in the foreground is all
    // we get. Android Native replaces this with a foreground service.
    this.running = typeof window !== "undefined";
    return this.running;
  }
  async stop() {
    this.running = false;
  }
  async isRunning() {
    return this.running;
  }
}

class WebNotifications implements NotificationBridge {
  async requestPermission() {
    if (typeof Notification === "undefined") return "denied" as const;
    const res = await Notification.requestPermission();
    return res === "granted" ? ("granted" as const) : ("denied" as const);
  }
  async notify({ title, body }: { title: string; body: string }) {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    new Notification(title, { body });
  }
  async cancel() {
    /* web notifications cannot be cancelled once shown */
  }
}

class WebPhoneActions implements PhoneActionsBridge {
  async call(number: string) {
    if (typeof window !== "undefined") window.location.href = `tel:${number}`;
  }
  async sendSms(number: string, message: string) {
    if (typeof window !== "undefined") {
      window.location.href = `sms:${number}?body=${encodeURIComponent(message)}`;
    }
  }
  async pickContact() {
    const contacts = (
      navigator as unknown as {
        contacts?: {
          select: (p: string[], o?: unknown) => Promise<{ name?: string[]; tel?: string[] }[]>;
        };
      }
    ).contacts;
    if (!contacts) return null;
    try {
      const [picked] = await contacts.select(["name", "tel"], { multiple: false });
      if (!picked) return null;
      return { name: picked.name?.[0] ?? "", number: picked.tel?.[0] };
    } catch {
      return null;
    }
  }
}

class WebAppControl implements AppControlBridge {
  async openApp() {
    return false; // Android Native only.
  }
  async openUrl(url: string) {
    if (typeof window !== "undefined") window.open(url, "_blank", "noopener");
  }
  async setVolume() {
    /* not permitted on the web */
  }
}

export class WebMobileBridge implements MobileBridge {
  readonly platform = "web" as const;
  readonly available = false;
  background = new WebBackgroundService();
  notifications = new WebNotifications();
  phone = new WebPhoneActions();
  apps = new WebAppControl();
}

let current: MobileBridge = new WebMobileBridge();

/** Android Native (or a test harness) calls this once at startup. */
export function registerMobileBridge(bridge: MobileBridge) {
  current = bridge;
}

export function mobileBridge(): MobileBridge {
  // A native host may inject itself on the window before the app boots.
  const injected =
    typeof window !== "undefined"
      ? (window as unknown as { NicoNativeBridge?: MobileBridge }).NicoNativeBridge
      : undefined;
  return injected ?? current;
}
