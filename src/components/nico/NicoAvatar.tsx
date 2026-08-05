import { PRESENCE_LABEL, type AssistantPresence } from "@/packages/voice/AssistantPresence";

/**
 * NicoAvatar — the phone-side face of the assistant.
 *
 * Purely presentational: it reflects the presence coming from the existing
 * voice runtime (idle / listening / thinking / speaking / sleeping) and the
 * live mic level. It does not own any state or logic.
 */
export function NicoAvatar({
  state,
  level,
  onPress,
}: {
  state: AssistantPresence;
  level: number;
  onPress: () => void;
}) {
  const listening = state === "listening";
  const speaking = state === "speaking";
  const thinking = state === "thinking";
  const sleeping = state === "sleeping";
  const amp = Math.min(Math.max(level, 0), 1);

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        onClick={onPress}
        aria-label={PRESENCE_LABEL[state]}
        data-presence={state}
        className="relative flex h-52 w-52 items-center justify-center rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-ring/60"
      >
        {(listening || speaking) && (
          <>
            <span className="absolute h-48 w-48 rounded-full border border-primary/40 animate-ripple" />
            <span
              className="absolute h-48 w-48 rounded-full border border-accent/30 animate-ripple"
              style={{ animationDelay: "0.7s" }}
            />
          </>
        )}
        {thinking && (
          <span className="absolute h-48 w-48 rounded-full border-2 border-dashed border-primary/40 animate-spin [animation-duration:6s]" />
        )}

        <span
          className={`nico-orb relative flex h-40 w-40 items-center justify-center rounded-full transition-all duration-300 animate-breathe ${
            sleeping ? "opacity-40 saturate-50 [animation-duration:7s]" : ""
          }`}
          style={{ transform: `scale(${sleeping ? 0.9 : 1 + amp * 0.14})` }}
        >
          {/* الوجه: عينان تنبضان مع الحالة وفم يتحرك أثناء الكلام */}
          <span className="flex flex-col items-center gap-4">
            <span className="flex items-center gap-6">
              <Eye closed={sleeping} narrow={thinking} />
              <Eye closed={sleeping} narrow={thinking} />
            </span>
            <span
              className="rounded-full bg-background/70 transition-all duration-150"
              style={{
                width: speaking ? 34 + amp * 26 : listening ? 26 : 22,
                height: speaking ? 6 + amp * 20 : 4,
              }}
            />
          </span>
        </span>
      </button>
      <p className="text-sm text-muted-foreground">{PRESENCE_LABEL[state]}</p>
    </div>
  );
}

function Eye({ closed, narrow }: { closed: boolean; narrow: boolean }) {
  return (
    <span
      className="rounded-full bg-background/80 transition-all duration-200"
      style={{ width: 12, height: closed ? 3 : narrow ? 7 : 14 }}
    />
  );
}
