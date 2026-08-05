import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NicoBrain } from "@/packages/core/NicoBrain";
import { MemoryManager } from "@/packages/memory/MemoryManager";
import { SkillManager } from "@/packages/skills/SkillManager";
import { PermissionManager } from "@/packages/permissions/PermissionManager";
import { VoiceManager, type VoiceState } from "@/packages/voice/VoiceManager";
import { reminderEngine } from "@/packages/tasks/ReminderEngine";
import { supabase } from "@/integrations/supabase/client";
import { nicoSync } from "@/lib/nicoSync";
import type {
  ConversationTurn,
  MemoryRecord,
  PermissionKey,
  PermissionState,
  ReminderTask,
} from "@/packages/shared/types";
import type { AgentTrace } from "@/packages/shared/agent";
import type { VoiceProfileData } from "@/packages/voice/VoiceProfile";
import type { VoiceSession } from "@/packages/voice/VoiceSessionManager";
import { derivePresence, type AssistantPresence } from "@/packages/voice/AssistantPresence";
import { NICO_AUTO_GREETING, NICO_PHRASES, humanize } from "@/packages/core/personality";
import { mobileBridge } from "@/packages/mobile-bridge";

/** Metadata captured for each spoken message. */
export interface VoiceMetadata {
  language: string;
  durationMs: number;
  confidence?: number;
}

/** Wires the Nico runtime into React state for any surface (web, dashboard). */
export function useNico() {
  const pendingSessionsRef = useRef<VoiceSession[]>([]);
  const runtime = useMemo(() => {
    const permissions = new PermissionManager();
    const memory = new MemoryManager();
    const skills = new SkillManager();
    const brain = new NicoBrain({ memory, skills, permissions });
    const voice = new VoiceManager({
      onSessionEnd: (session) => pendingSessionsRef.current.push(session),
    });
    return { permissions, memory, skills, brain, voice };
  }, []);

  const [state, setState] = useState<VoiceState>("idle");
  const [level, setLevel] = useState(0);
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [tasks, setTasks] = useState<ReminderTask[]>([]);
  const [permissions, setPermissions] = useState<Record<PermissionKey, PermissionState>>(() =>
    runtime.permissions.snapshot(),
  );
  const [error, setError] = useState<string | null>(null);
  const [lastIntent, setLastIntent] = useState<string | null>(null);
  const [lastTrace, setLastTrace] = useState<AgentTrace | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfileData>(
    () => runtime.voice.profile.data,
  );

  /** Phase 7 assistant behaviour toggles, mirrored to `voice_settings`. */
  const [assistant, setAssistant] = useState({
    autoGreeting: true,
    alwaysReady: false,
    wakeWordEnabled: false,
    wakeWord: "يا نيكو",
  });
  const [greeted, setGreeted] = useState(false);
  const [wakeArmed, setWakeArmed] = useState(false);

  const [continuous, setContinuous] = useState(false);
  const continuousRef = useRef(false);
  const stopListeningRef = useRef<(() => Promise<void>) | null>(null);
  const startListeningRef = useRef<(() => Promise<void>) | null>(null);
  const rafRef = useRef<number | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const signedInRef = useRef(false);
  const greetedRef = useRef(false);

  /** Fire-and-forget activity log; silently skipped for guests. */
  const logEvent = useCallback((event_type: string, detail?: string) => {
    if (!signedInRef.current) return;
    void nicoSync.logEvent({ event_type, detail }).catch(() => {});
  }, []);

  // Auth state + initial bootstrap from Supabase.
  useEffect(() => {
    let mounted = true;
    async function loadForUser() {
      try {
        const bootstrap = await nicoSync.bootstrap();
        if (!mounted) return;
        signedInRef.current = true;
        // Hydrate profile.
        if (bootstrap.profile) {
          runtime.memory.profile.update({
            isGuest: false,
            name: bootstrap.profile.preferred_name ?? undefined,
            preferredName: bootstrap.profile.preferred_name ?? undefined,
            locale: (bootstrap.profile.language as "ar" | "en") ?? "ar",
            communicationStyle:
              (bootstrap.profile.communication_style as "concise" | "balanced" | "detailed") ??
              "concise",
          });
        }
        // Hydrate memories into local LTM view.
        const mapped: MemoryRecord[] = bootstrap.memories.map((m) => ({
          id: m.id,
          key: m.key ?? m.content.slice(0, 40),
          value: m.content,
          kind: (m.type as MemoryRecord["kind"]) ?? "fact",
          createdAt: new Date(m.created_at).getTime(),
          score: m.score ?? 1,
          importance: m.importance as MemoryRecord["importance"],
          retention: m.retention as MemoryRecord["retention"],
        }));
        setMemories(mapped);
        const conv = await nicoSync.ensureConversation();
        conversationIdRef.current = conv.id;
      } catch (e) {
        console.error("nico bootstrap failed", e);
      }
    }

    supabase.auth
      .getSession()
      .then((res) => {
        if (res?.data?.session?.user) {
          setAuthEmail(res.data.session.user.email ?? null);
          loadForUser();
        }
      })
      .catch((e) => console.warn("[Supabase] getSession failed", e));

    const sub = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") {
        setAuthEmail(session?.user?.email ?? null);
        loadForUser();
      } else if (event === "SIGNED_OUT") {
        signedInRef.current = false;
        conversationIdRef.current = null;
        setAuthEmail(null);
        runtime.memory.forgetAll();
        setMemories([]);
        setTurns([]);
      }
    });
    return () => {
      mounted = false;
      sub.data.subscription.unsubscribe();
    };
  }, [runtime]);

  useEffect(() => {
    runtime.permissions.hydrate();
    setMemories(runtime.memory.longTerm.all());
    reminderEngine.bindVoice((text) => void runtime.voice.say(text));
    const offVoice = runtime.voice.subscribe(setState);
    const offPerm = runtime.permissions.subscribe(setPermissions);
    const offTasks = reminderEngine.subscribe(setTasks);
    return () => {
      offVoice();
      offPerm();
      offTasks();
      runtime.voice.cancel();
    };
  }, [runtime]);

  // Hydrate cloud voice preferences and flush completed sessions to the cloud.
  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      if (!signedInRef.current) return;
      try {
        const prefs = await nicoSync.getVoicePreferences();
        if (!prefs || cancelled) return;
        setVoiceProfile(
          runtime.voice.profile.update({
            voiceId: prefs.voice_name,
            speed: Number(prefs.speed),
            style: prefs.tone as VoiceProfileData["style"],
            language: prefs.language as "ar" | "en",
          }),
        );
      } catch (e) {
        console.error("voice prefs hydrate failed", e);
      }
      try {
        const settings = await nicoSync.getVoiceSettings();
        if (!settings || cancelled) return;
        setAssistant({
          autoGreeting: settings.auto_greeting,
          alwaysReady: settings.always_ready,
          wakeWordEnabled: settings.wake_word_enabled,
          wakeWord: settings.wake_word,
        });
        setVoiceProfile(
          runtime.voice.profile.update({
            voiceId: settings.voice_id,
            speed: Number(settings.speed),
            pitch: Number(settings.pitch),
            style: settings.style as VoiceProfileData["style"],
            language: settings.language as "ar" | "en",
          }),
        );
      } catch (e) {
        console.error("voice settings hydrate failed", e);
      }
    }
    void hydrate();

    const flush = window.setInterval(() => {
      if (!signedInRef.current) return;
      const pending = pendingSessionsRef.current.splice(0);
      for (const session of pending) {
        void nicoSync
          .saveVoiceSession({
            conversation_id: conversationIdRef.current ?? undefined,
            duration: Math.round(session.durationMs / 1000),
            language: session.language,
            confidence: session.confidence,
          })
          .catch((e) => console.error("voice session save failed", e));
      }
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(flush);
    };
  }, [runtime, authEmail]);

  useEffect(() => {
    if (state === "idle") {
      setLevel(0);
      return;
    }
    const loop = () => {
      setLevel(runtime.voice.level());
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [state, runtime]);

  const persistTurn = useCallback(
    async (
      role: "user" | "nico",
      content: string,
      intent?: string,
      voiceMeta?: Record<string, unknown>,
    ) => {
      if (!signedInRef.current) return;
      try {
        if (!conversationIdRef.current) {
          const c = await nicoSync.ensureConversation();
          conversationIdRef.current = c.id;
        }
        await nicoSync.saveMessage({
          conversation_id: conversationIdRef.current!,
          role,
          content,
          intent,
          voice_metadata: voiceMeta,
        });
      } catch (e) {
        console.error("persist message failed", e);
      }
    },
    [],
  );

  const process = useCallback(
    async (transcript: string, voiceMeta?: VoiceMetadata) => {
      if (!transcript.trim()) return;
      setError(null);
      void persistTurn(
        "user",
        transcript,
        undefined,
        voiceMeta as unknown as Record<string, unknown> | undefined,
      );

      // Offline shortcut: simple commands answer from the local cache.
      const offline = runtime.voice.resolveOffline(transcript);
      if (offline) {
        setTurns(runtime.memory.shortTerm.history());
        await runtime.voice.say(offline);
        return;
      }

      console.log("NICO STEP 1 BEFORE MEMORY");
      const beforeIds = new Set(runtime.memory.longTerm.all().map((m) => m.id));
      console.log("NICO STEP 2 BEFORE BRAIN");
      console.log("NICO BEFORE BRAIN:", transcript);
      console.log("NICO STEP 3 CALL BRAIN", transcript);
      const res = await runtime.brain.handle(transcript);
      console.log("NICO STEP 4 BRAIN DONE", res.speech);
      setLastIntent(res.intent.name);
      setLastTrace(res.trace);

      // Just-in-time consent: only ask for what this specific request needs.
      const needed = PermissionManager.permissionForIntent(res.intent.name);
      if (needed && !runtime.permissions.isGranted(needed)) {
        const status = await runtime.permissions.ensure(needed);
        logEvent("permission_request", `${needed}:${status}`);
        if (signedInRef.current) {
          void nicoSync.saveDevicePermission({ permission: needed, status }).catch(() => {});
        }
      }

      setTurns(runtime.memory.shortTerm.history());
      setMemories(runtime.memory.longTerm.all());
      runtime.voice.cache.put(transcript, res.speech);

      // Mirror newly-created LTM entries to the database.
      if (signedInRef.current) {
        const fresh = runtime.memory.longTerm.all().filter((m) => !beforeIds.has(m.id));
        for (const m of fresh) {
          try {
            await nicoSync.saveMemory({
              key: m.key,
              content: m.value,
              type: m.kind,
              importance: m.importance,
              retention: m.retention,
              confirmed: true,
            });
          } catch (e) {
            console.error("persist memory failed", e);
          }
        }
        if (res.learning) {
          void nicoSync.saveLearning({
            signal_type: res.learning,
            correction: transcript,
            confidence: 0.7,
          });
        }
      }

      const speech = humanize(res.speech);
      void persistTurn("nico", speech, res.intent.name);
      logEvent("reply", res.intent.name);
      await runtime.voice.say(speech);
    },
    [runtime, persistTurn, logEvent],
  );

  const startListening = useCallback(async () => {
    setError(null);
    try {
      if (!runtime.permissions.isGranted("microphone")) {
        const granted = await runtime.permissions.ensure("microphone");
        if (signedInRef.current) {
          void nicoSync
            .saveDevicePermission({ permission: "microphone", status: granted })
            .catch(() => {});
        }
        if (granted !== "granted") {
          setError(NICO_PHRASES.micDenied);
          return;
        }
      }
      logEvent("listen_start");
      await runtime.voice.startListening();
    } catch {
      setError(NICO_PHRASES.micFailed);
    }
  }, [runtime, logEvent]);

  const stopListening = useCallback(async () => {
    try {
      console.log("STEP A");
      const result = await runtime.voice.stopListening();
      console.log("STEP B", result);
      if (!result.text) {
        if (!continuousRef.current) setError(NICO_PHRASES.notHeard);
        return;
      }
      setTurns((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "user", content: result.text, createdAt: Date.now() },
      ]);
      console.log("STEP C BEFORE PROCESS", result.text);
      await process(result.text, {
        language: result.language,
        durationMs: result.durationMs,
        confidence: result.confidence,
      });
    } catch (e) {
      if (!continuousRef.current) {
        setError(e instanceof Error ? e.message : NICO_PHRASES.failed);
      }
      runtime.voice.cancel();
    } finally {
      // Conversation loop: once Nico stops speaking he listens again.
      if (continuousRef.current) {
        window.setTimeout(() => {
          if (continuousRef.current && runtime.voice.current === "idle") void startListening();
        }, 350);
      }
    }
  }, [runtime, process, startListening]);

  // Keep the refs pointing at the latest handlers (VAD + wake word call them).
  useEffect(() => {
    stopListeningRef.current = stopListening;
    startListeningRef.current = startListening;
  }, [stopListening, startListening]);

  // Voice activity detection ends the utterance without a button press.
  useEffect(() => {
    runtime.voice.setHooks({
      onAutoStop: () => {
        if (runtime.voice.current === "listening") void stopListeningRef.current?.();
      },
    });
  }, [runtime]);

  /** Hands-free mode: listen → think → speak → listen again. */
  const startConversation = useCallback(async () => {
    continuousRef.current = true;
    setContinuous(true);
    logEvent("conversation_start");
    await startListening();
  }, [startListening, logEvent]);

  const stopConversation = useCallback(() => {
    continuousRef.current = false;
    setContinuous(false);
    runtime.voice.cancel();
    logEvent("conversation_stop");
  }, [runtime, logEvent]);

  /**
   * Auto greeting: Nico speaks first, right after the microphone is allowed —
   * no button press. Runs once per app load.
   */
  const greet = useCallback(
    async (opts: { force?: boolean } = {}) => {
      if (greetedRef.current && !opts.force) return;
      greetedRef.current = true;
      setGreeted(true);
      logEvent("auto_greeting");
      try {
        await runtime.voice.say(NICO_AUTO_GREETING);
      } catch {
        /* autoplay may block until the first tap; the text is on screen */
      }
    },
    [runtime, logEvent],
  );

  // Returning users: if the mic is already granted, Nico greets on his own.
  useEffect(() => {
    if (!assistant.autoGreeting || greetedRef.current) return;
    if (!runtime.permissions.isGranted("microphone")) return;
    void greet();
  }, [assistant.autoGreeting, runtime, greet]);

  /** Always Ready: wake word armed, session opened the moment Nico is called. */
  const setAlwaysReady = useCallback(
    async (on: boolean) => {
      setAssistant((prev) => ({ ...prev, alwaysReady: on, wakeWordEnabled: on }));
      if (signedInRef.current) {
        void nicoSync
          .saveVoiceSettings({ always_ready: on, wake_word_enabled: on })
          .catch(() => {});
      }
      if (!on) {
        runtime.voice.wakeWord.disable();
        setWakeArmed(false);
        continuousRef.current = false;
        setContinuous(false);
        runtime.voice.cancel();
        logEvent("always_ready_off");
        return;
      }
      const status = await runtime.permissions.ensure("microphone");
      if (status !== "granted") {
        setError(NICO_PHRASES.micDenied);
        return;
      }
      await runtime.permissions.ensure("background_audio");
      void mobileBridge().background.start({ wakeWord: assistant.wakeWord });
      runtime.voice.wakeWord.useDefaultDetector(
        runtime.voice.profile.data.language === "en" ? "en-US" : "ar-SA",
      );
      const armed = await runtime.voice.wakeWord.enable();
      setWakeArmed(armed);
      logEvent("always_ready_on", armed ? "wake_word_armed" : "wake_word_unavailable");
      if (!armed) {
        // No wake-word backend here (Android Native supplies one): fall back to
        // the hands-free loop so Nico still feels present.
        await startConversation();
      }
    },
    [runtime, assistant.wakeWord, startConversation, logEvent],
  );

  // Wake word → open a listening session immediately.
  useEffect(() => {
    const off = runtime.voice.wakeWord.onWake(() => {
      logEvent("wake_word");
      if (runtime.voice.current === "idle") {
        continuousRef.current = true;
        setContinuous(true);
        void startListeningRef.current?.();
      }
    });
    return () => {
      off();
    };
  }, [runtime, logEvent]);

  const presence: AssistantPresence = derivePresence(state, {
    wakeWordArmed: wakeArmed && !continuous,
  });

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return {
    runtime,
    state,
    level,
    turns,
    memories,
    tasks,
    permissions,
    error,
    lastIntent,
    lastTrace,
    authEmail,
    isAuthenticated: !!authEmail,
    session: runtime.brain.conversation?.session?.current() ?? {
      id: "default",
      startedAt: Date.now(),
      lastActivityAt: Date.now(),
      turns: 0,
      isGuest: true,
    },
    activeTopic: runtime.brain.conversation?.memory?.activeTopic() ?? null,
    profile: runtime.memory.profile.data,
    skills: runtime.skills.list(),
    startListening,
    stopListening,
    continuous,
    startConversation,
    stopConversation,
    presence,
    greeted,
    greet,
    assistant,
    wakeWordArmed: wakeArmed,
    setAlwaysReady,
    setAutoGreeting: (on: boolean) => {
      setAssistant((prev) => ({ ...prev, autoGreeting: on }));
      if (signedInRef.current) {
        void nicoSync.saveVoiceSettings({ auto_greeting: on }).catch(() => {});
      }
    },
    logEvent,
    permissionReason: (key: PermissionKey) => runtime.permissions.reason(key),
    isGuest: !authEmail,

    sendText: process,
    signOut,
    requestPermission: (key: PermissionKey) => runtime.permissions.request(key),
    revokePermission: (key: PermissionKey) => runtime.permissions.revoke(key),
    forgetAll: async () => {
      if (signedInRef.current) {
        for (const m of runtime.memory.longTerm.all()) {
          try {
            await nicoSync.deleteMemory(m.id);
          } catch (e) {
            console.error(e);
          }
        }
      }
      runtime.memory.forgetAll();
      setMemories([]);
      setTurns([]);
    },
    forget: async (query: string) => {
      const targets = runtime.memory.longTerm.search(query, 20);
      if (signedInRef.current) {
        for (const t of targets) {
          try {
            await nicoSync.deleteMemory(t.id);
          } catch (e) {
            console.error(e);
          }
        }
      }
      const n = runtime.memory.forget(query);
      setMemories(runtime.memory.longTerm.all());
      return n;
    },
    deleteMemory: async (id: string) => {
      if (signedInRef.current) {
        try {
          await nicoSync.deleteMemory(id);
        } catch (e) {
          console.error(e);
        }
      }
      runtime.memory.longTerm.forget(id);
      setMemories(runtime.memory.longTerm.all());
    },
    describeMemories: () => runtime.memory.describeAll(),
    pendingMemories: () => runtime.memory.pendingMemories(),
    confirmPending: (id: string) => {
      const r = runtime.memory.confirmPending(id);
      setMemories(runtime.memory.longTerm.all());
      if (r && signedInRef.current) {
        void nicoSync.saveMemory({
          key: r.key,
          content: r.value,
          type: r.kind,
          importance: r.importance,
          retention: r.retention,
          confirmed: true,
        });
      }
      return r;
    },
    rejectPending: (id: string) => runtime.memory.rejectPending(id),
    updateProfile: (patch: Parameters<typeof runtime.memory.profile.update>[0]) => {
      const next = runtime.memory.profile.update(patch);
      if (signedInRef.current) {
        void nicoSync.updateProfile({
          preferred_name: next.preferredName ?? next.name,
          language: next.locale,
          communication_style: next.communicationStyle,
          preferences: next.preferences,
          interests: next.interests,
          important_dates: next.importantDates,
        });
      }
      return next;
    },
    voiceProfile,
    updateVoiceProfile: (patch: Partial<VoiceProfileData>) => {
      const next = runtime.voice.profile.update(patch);
      setVoiceProfile(next);
      if (signedInRef.current) {
        void nicoSync.saveVoicePreferences({
          voice_name: next.voiceId,
          speed: next.speed,
          tone: next.style,
          language: next.language,
        });
        void nicoSync
          .saveVoiceSettings({
            voice_id: next.voiceId,
            speed: next.speed,
            pitch: next.pitch,
            style: next.style,
            language: next.language,
          })
          .catch(() => {});
      }

      return next;
    },
    registerUser: (name?: string) => runtime.memory.profile.register(name),
    cancel: () => runtime.voice.cancel(),
  };
}
