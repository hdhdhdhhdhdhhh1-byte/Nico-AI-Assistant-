import type { VoiceState } from "@/packages/voice/VoiceManager";

const BARS = 28;

export function VoiceWaves({ state, level }: { state: VoiceState; level: number }) {
  const active = state === "listening" || state === "speaking";

  return (
    <div className="flex h-16 items-end justify-center gap-1.5" aria-hidden>
      {Array.from({ length: BARS }).map((_, i) => {
        const wave = Math.sin((i / BARS) * Math.PI);
        const height = active ? 8 + wave * level * 56 + (i % 3) * 3 : 6;
        return (
          <span
            key={i}
            className={`w-1.5 rounded-full transition-[height] duration-100 ${
              state === "speaking" ? "bg-accent" : "bg-primary"
            } ${active ? "opacity-90" : "opacity-25"}`}
            style={{ height: `${height}px` }}
          />
        );
      })}
    </div>
  );
}
