/**
 * useNicoMobile — the phone-facing wrapper around the existing `useNico`.
 *
 * It does not create a second brain: it takes the same runtime and adds
 * onboarding state, phone permissions, the voice background service, guest
 * data upgrade on sign-in, and crash-safe error surfaces.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNico } from "./useNico";
import {
  MobilePermissions,
  VoiceBackgroundService,
  initNicoMobile,
  isNativePlatform,
  tapFeedback,
  upgradeGuestData,
  type BackgroundServiceState,
} from "@/packages/mobile";
import { onNativeWake } from "@/packages/mobile-bridge/wake";
import type { PermissionKey } from "@/packages/shared/types";

const ONBOARD_KEY = "nico.mobile.onboarded.v1";

export function hasCompletedMobileOnboarding(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(ONBOARD_KEY) === "done";
  } catch {
    return true;
  }
}

export function markMobileOnboarded() {
  try {
    window.localStorage.setItem(ONBOARD_KEY, "done");
  } catch {
    /* ignore */
  }
}

export function useNicoMobile() {
  const nico = useNico();
  const [native, setNative] = useState(false);
  const [onboarded, setOnboarded] = useState(true);
  const [background, setBackground] = useState<BackgroundServiceState>("stopped");
  const [migrated, setMigrated] = useState<number | null>(null);
  const [offline, setOffline] = useState(false);
  const [mobileError, setMobileError] = useState<string | null>(null);
  const [wokeAt, setWokeAt] = useState<number | null>(null);
  const upgradedFor = useRef<string | null>(null);

  const permissions = useMemo(
    () => new MobilePermissions(nico.runtime.permissions),
    [nico.runtime],
  );
  const service = useMemo(() => new VoiceBackgroundService(nico.runtime.voice), [nico.runtime]);

  // Boot the native shell and read first-run state.
  useEffect(() => {
    void initNicoMobile().then(setNative);
    setOnboarded(hasCompletedMobileOnboarding());
    setNative(isNativePlatform());
  }, []);

  // Connectivity → offline fallback banner.
  useEffect(() => {
    const update = () => setOffline(typeof navigator !== "undefined" && !navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  // Background service lifecycle mirrors the always-ready toggle.
  useEffect(() => {
    const off = service.subscribe(setBackground);
    return () => {
      off();
      void service.dispose();
    };
  }, [service]);

  useEffect(() => {
    if (!nico.assistant.alwaysReady) {
      if (background === "running" || background === "starting") void service.stop();
      return;
    }
    void service.start({
      wakeWord: nico.assistant.wakeWord,
      onSuspend: () => setMobileError(null),
      onReconnect: () => {
        // Voice reconnect: re-arm the hands-free loop after returning.
        if (nico.assistant.alwaysReady) void nico.startConversation();
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nico.assistant.alwaysReady, nico.assistant.wakeWord, service]);

  // Native wake word: «يا نيكو» detected by the foreground service opens a
  // hands-free conversation on the same brain, no button press needed.
  useEffect(() => {
    return onNativeWake(() => {
      setWokeAt(Date.now());
      void tapFeedback();
      void nico.startConversation();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nico.startConversation]);

  // Guest data is promoted to the account the first time the user signs in.
  useEffect(() => {
    if (!nico.authEmail || upgradedFor.current === nico.authEmail) return;
    upgradedFor.current = nico.authEmail;
    void upgradeGuestData(nico.runtime.memory, nico.authEmail)
      .then((res) => setMigrated(res.migrated))
      .catch(() => setMigrated(null));
  }, [nico.authEmail, nico.runtime]);

  const requestPermission = useCallback(
    async (key: PermissionKey) => {
      try {
        return await permissions.request(key);
      } catch {
        setMobileError("تعذر طلب الإذن، جرّب من إعدادات الهاتف.");
        return "denied" as const;
      }
    },
    [permissions],
  );

  /** Onboarding completion: mark as done, then Nico speaks first. */
  const finishOnboarding = useCallback(async () => {
    markMobileOnboarded();
    setOnboarded(true);
    void tapFeedback();
    try {
      await nico.greet({ force: true });
    } catch {
      /* autoplay blocked; the greeting is on screen */
    }
  }, [nico]);

  return {
    ...nico,
    native,
    onboarded,
    finishOnboarding,
    mobilePermissions: permissions,
    requestPermission,
    background,
    offline,
    wokeAt,
    migratedMemories: migrated,
    mobileError,
    clearMobileError: () => setMobileError(null),
  };
}
