import { PRESENCE_LABEL, type AssistantPresence } from "@/packages/voice/AssistantPresence";

export function NicoOrb({
  state,
  level,
  onPress,
}: {
  state: AssistantPresence;
  level: number;
  onPress: () => void;
}) {
  const active = state === "listening" || state === "speaking";
  const sleeping = state === "sleeping";
  const thinking = state === "thinking";
  const scale = 1 + Math.min(level, 1) * 0.18;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative flex h-64 w-64 items-center justify-center">
        {active && (
          <>
            <span className="absolute h-52 w-52 rounded-full border border-primary/40 animate-ripple" />
            <span
              className="absolute h-52 w-52 rounded-full border border-accent/30 animate-ripple"
              style={{ animationDelay: "0.8s" }}
            />
          </>
        )}
        {thinking && (
          <span className="absolute h-52 w-52 rounded-full border-2 border-dashed border-primary/40 animate-spin [animation-duration:6s]" />
        )}
        <button
          type="button"
          onClick={onPress}
          aria-label={PRESENCE_LABEL[state]}
          data-presence={state}
          className={`nico-orb relative h-44 w-44 rounded-full transition-all duration-300 animate-breathe focus:outline-none focus-visible:ring-4 focus-visible:ring-ring/60 ${
            sleeping ? "opacity-40 saturate-50 [animation-duration:6s]" : ""
          }`}
          style={{ transform: `scale(${sleeping ? 0.88 : scale})` }}
        >
          <span className="sr-only">{PRESENCE_LABEL[state]}</span>
          <span className="absolute inset-6 rounded-full bg-background/10 backdrop-blur-sm" />
        </button>
      </div>
      <p className="text-lg font-medium text-muted-foreground">{PRESENCE_LABEL[state]}</p>
    </div>
  );
}
