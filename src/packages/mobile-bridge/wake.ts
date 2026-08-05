/**
 * Native wake-word events.
 *
 * `VoiceBackgroundService` (Kotlin) detects «يا نيكو» while the app is in the
 * background and brings the activity forward with the `com.nico.ai.WAKE`
 * intent. The Capacitor plugin re-emits that as a `wake` event, which this
 * module turns into a plain callback for the TypeScript layer.
 *
 * Nothing here knows about NicoBrain: it only says "the user called Nico".
 */
import { isNativePlatform } from "./capacitor";

type PluginListener = { remove: () => void | Promise<void> };
type WakePlugin = {
  addListener?: (event: "wake", cb: () => void) => Promise<PluginListener> | PluginListener;
};

function wakePlugin(): WakePlugin | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { Capacitor?: { Plugins?: { NicoVoiceService?: WakePlugin } } })
    .Capacitor?.Plugins?.NicoVoiceService;
}

/**
 * Subscribe to native wake-word detections. Returns an unsubscribe function.
 * On the web (and before the native plugin is installed) it is a no-op, so
 * every existing surface keeps working unchanged.
 */
export function onNativeWake(handler: () => void): () => void {
  if (!isNativePlatform()) return () => {};

  let disposed = false;
  const pending: PluginListener[] = [];

  const register = async () => {
    try {
      const sub = await wakePlugin()?.addListener?.("wake", handler);
      if (sub && !disposed) pending.push(sub);
      else if (sub) void sub.remove();
    } catch {
      /* plugin without listener support */
    }
    try {
      // Fallback path: the launch intent resumes the app instead of emitting.
      const { App } = await import("@capacitor/app");
      const sub = await App.addListener("appUrlOpen", ({ url }) => {
        if (typeof url === "string" && url.includes("wake")) handler();
      });
      if (!disposed) pending.push(sub);
      else void sub.remove();
    } catch {
      /* App plugin unavailable */
    }
  };
  void register();

  return () => {
    disposed = true;
    pending.forEach((s) => void s.remove());
    pending.length = 0;
  };
}
