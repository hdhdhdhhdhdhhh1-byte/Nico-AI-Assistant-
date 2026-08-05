/**
 * @nico/mobile — the phone layer.
 *
 * It adds a native shell around the existing runtime (brain, memory,
 * personality, learning, voice, Supabase). No intelligence lives here.
 */
export * from "./MobilePermissions";
export * from "./VoiceBackgroundService";
export * from "./GuestUpgrade";
export {
  isNativePlatform,
  nativePlatform,
  installCapacitorBridge,
} from "../mobile-bridge/capacitor";

import { installCapacitorBridge, isNativePlatform } from "../mobile-bridge/capacitor";

let booted = false;

/**
 * Boots the native shell once: installs the Capacitor bridge, themes the
 * status bar and dismisses the splash screen. A no-op in the browser.
 */
export async function initNicoMobile(): Promise<boolean> {
  if (booted || typeof window === "undefined") return isNativePlatform();
  booted = true;
  if (!isNativePlatform()) return false;

  installCapacitorBridge();

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#070B18" });
  } catch {
    /* status bar not available */
  }
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch {
    /* no splash screen */
  }
  return true;
}

/** Light haptic feedback for voice state changes; silent on the web. */
export async function tapFeedback(): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    /* no haptics */
  }
}
