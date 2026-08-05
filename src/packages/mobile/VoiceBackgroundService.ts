/**
 * VoiceBackgroundService (TypeScript side).
 *
 * Owns the phone-side voice session lifecycle around the existing
 * VoiceManager: app-state transitions, reconnect after a dropped session,
 * wake-word arming, and the native foreground service handshake.
 *
 * The native counterpart lives in
 * `apps/mobile/android/VoiceBackgroundService.kt`. When it is not installed,
 * every call degrades to a foreground-only session — nothing throws.
 */
import type { VoiceManager } from "../voice/VoiceManager";
import { mobileBridge } from "../mobile-bridge";
import { isNativePlatform } from "../mobile-bridge/capacitor";

export type BackgroundServiceState = "stopped" | "starting" | "running" | "unavailable";

export interface VoiceBackgroundOptions {
  wakeWord?: string;
  foregroundText?: string;
  /** Called when the app returns to the foreground and the mic must re-arm. */
  onReconnect?: () => void;
  /** Called when the app is backgrounded and any open session must close. */
  onSuspend?: () => void;
}

export class VoiceBackgroundService {
  private state: BackgroundServiceState = "stopped";
  private listeners = new Set<(s: BackgroundServiceState) => void>();
  private cleanups: (() => void)[] = [];
  private opts: VoiceBackgroundOptions = {};
  private wasActive = false;

  constructor(private readonly voice: VoiceManager) {}

  get current() {
    return this.state;
  }

  subscribe(fn: (s: BackgroundServiceState) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private set(next: BackgroundServiceState) {
    this.state = next;
    this.listeners.forEach((l) => l(next));
  }

  /**
   * Battery-aware: the service is only started after the user explicitly
   * enables always-ready listening, and it is stopped as soon as they turn it
   * off or the app is closed.
   */
  async start(options: VoiceBackgroundOptions = {}): Promise<BackgroundServiceState> {
    this.opts = { ...this.opts, ...options };
    this.set("starting");
    await this.bindAppState();

    const started = await mobileBridge().background.start({
      wakeWord: this.opts.wakeWord ?? "يا نيكو",
      foregroundText: this.opts.foregroundText ?? "نيكو جاهز — قل «يا نيكو»",
    });

    this.set(started ? "running" : isNativePlatform() ? "unavailable" : "unavailable");
    return this.state;
  }

  async stop() {
    await mobileBridge().background.stop();
    this.voice.cancel();
    this.unbind();
    this.set("stopped");
  }

  /** App lifecycle: suspend an open mic when hidden, re-arm when visible. */
  private async bindAppState() {
    this.unbind();

    const onHidden = () => {
      this.wasActive = this.voice.current !== "idle" || this.voice.continuous;
      if (this.voice.current === "listening" || this.voice.current === "speaking") {
        this.voice.cancel();
        this.opts.onSuspend?.();
      }
    };
    const onVisible = () => {
      if (!this.wasActive) return;
      this.wasActive = false;
      this.opts.onReconnect?.();
    };

    if (typeof document !== "undefined") {
      const handler = () => (document.hidden ? onHidden() : onVisible());
      document.addEventListener("visibilitychange", handler);
      this.cleanups.push(() => document.removeEventListener("visibilitychange", handler));
    }

    if (isNativePlatform()) {
      try {
        const { App } = await import("@capacitor/app");
        const sub = await App.addListener("appStateChange", ({ isActive }) =>
          isActive ? onVisible() : onHidden(),
        );
        this.cleanups.push(() => void sub.remove());
      } catch {
        /* running without the App plugin */
      }
    }
  }

  private unbind() {
    this.cleanups.forEach((fn) => fn());
    this.cleanups = [];
  }

  /** Called on unmount so no listener or service survives the screen. */
  async dispose() {
    this.unbind();
    if (this.state === "running") await mobileBridge().background.stop();
    this.set("stopped");
  }
}
