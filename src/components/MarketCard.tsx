import { useRef, useState } from "react";
import { Lock, X, ArrowUpRight } from "lucide-react";
import { CONFIDENCE, type Market } from "@/lib/campus";

export function MarketCard({ market }: { market: Market }) {
  const [side, setSide] = useState<"YES" | "NO" | null>(null);
  const [confidence, setConfidence] = useState(100);
  const [locked, setLocked] = useState(false);
  const [progress, setProgress] = useState(0);
  const [open, setOpen] = useState(false);
  const dragging = useRef(false);
  const track = useRef<HTMLDivElement>(null);

  const move = (clientX: number) => {
    if (!dragging.current || !track.current) return;
    const r = track.current.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (clientX - r.left) / (r.width - 48)));
    setProgress(p);
    if (p > 0.92) {
      dragging.current = false;
      setLocked(true);
      setProgress(1);
    }
  };

  const reset = () => {
    setSide(null);
    setLocked(false);
    setProgress(0);
  };

  return (
    <article className="panel grain relative overflow-hidden p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="label">{market.category}</span>
        <span className="label">{market.closes}</span>
      </div>

      <h3 className="text-xl font-medium leading-snug tracking-tight sm:text-[1.35rem]">
        {market.question}
      </h3>

      <div className="mt-5 flex items-baseline justify-between">
        <span className="label">Yes</span>
        <span className="font-mono text-sm text-campus-secondary">{market.yes}%</span>
      </div>
      <div className="mt-2 h-[3px] w-full rounded-full bg-white/8">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{
            width: `${market.yes}%`,
            background: `linear-gradient(90deg, var(--campus-primary), var(--campus-secondary))`,
          }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="label">{market.predicting} Predicting</span>
        <span className="label flex items-center gap-1 text-campus-secondary/80">
          <ArrowUpRight className="h-3 w-3" /> {market.delta}
        </span>
      </div>

      {!side ? (
        <div className="mt-5 grid grid-cols-2 gap-3">
          {(["YES", "NO"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSide(s)}
              className="ghost-btn py-3.5 text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-5">
          <div className="flex items-center justify-between">
            <span className="label text-foreground">You · {side}</span>
            <button onClick={reset} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="label mt-4">Your confidence</p>
          <div className="mt-2 grid grid-cols-4 gap-3">
            {CONFIDENCE.map((v) => (
              <button
                key={v}
                onClick={() => setConfidence(v)}
                className={`ghost-btn py-3 ${
                  confidence === v
                    ? "border-campus-secondary/60 bg-white/6 text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          <div
            ref={track}
            onPointerDown={(e) => {
              if (locked) return;
              dragging.current = true;
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            }}
            onPointerMove={(e) => move(e.clientX)}
            onPointerUp={() => {
              dragging.current = false;
              if (!locked) setProgress(0);
            }}
            className="relative mt-4 h-14 select-none overflow-hidden rounded-xl border border-hairline bg-white/3"
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="label text-foreground">
                {locked ? `Locked · ${confidence}` : "Slide to lock →"}
              </span>
            </div>
            <div
              className="absolute top-1.5 flex h-11 w-11 items-center justify-center rounded-lg transition-transform"
              style={{
                left: 6,
                transform: `translateX(calc(${progress} * (100% + ${
                  track.current ? track.current.clientWidth - 56 : 0
                }px - 100%)))`,
                background: `color-mix(in oklab, var(--campus-primary) 70%, transparent)`,
              }}
            >
              <Lock className="h-4 w-4" />
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="label mt-5 block w-full border-t border-hairline pt-4 text-left hover:text-foreground"
      >
        How this resolves {open ? "−" : "+"}
      </button>
      {open && (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Resolved by campus consensus and verified sources within 24 hours of the close time.
          Disputed outcomes go to a moderator review queue.
        </p>
      )}
    </article>
  );
}
