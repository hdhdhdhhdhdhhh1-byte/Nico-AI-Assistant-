/**
 * Mobile bridge contracts.
 *
 * These interfaces describe what an Android Native host must implement so
 * Nico can run as a real system assistant. Nothing here talks to the network
 * or the DOM: the web app uses the no-op web implementation, and a future
 * Android WebView / Capacitor layer injects a native implementation.
 */

export type BridgePlatform = "web" | "android" | "ios";

export interface BackgroundServiceBridge {
  /** Keep the wake-word listener alive while the app is backgrounded. */
  start(options?: { wakeWord?: string; foregroundText?: string }): Promise<boolean>;
  stop(): Promise<void>;
  isRunning(): Promise<boolean>;
}

export interface NotificationBridge {
  requestPermission(): Promise<"granted" | "denied" | "prompt">;
  notify(input: { title: string; body: string; at?: number; id?: string }): Promise<void>;
  cancel(id: string): Promise<void>;
}

export interface PhoneActionsBridge {
  call(number: string): Promise<void>;
  sendSms(number: string, message: string): Promise<void>;
  pickContact(): Promise<{ name: string | any; number?: string | null | undefined } | null>;
}

export interface AppControlBridge {
  openApp(packageName: string): Promise<boolean>;
  openUrl(url: string): Promise<void>;
  setVolume(level: number): Promise<void>;
}

export interface MobileBridge {
  readonly platform: BridgePlatform;
  readonly available: boolean;
  background: BackgroundServiceBridge;
  notifications: NotificationBridge;
  phone: PhoneActionsBridge;
  apps: AppControlBridge;
}
