import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Lock, X, ArrowUpRight, AlertTriangle, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { CONFIDENCE, type Market } from "@/lib/campus";
import { useSession } from "@/lib/session";
import { lockPrediction, listMyPredictions } from "@/lib/predictions.functions";

type LockedRow = {
  reference_id: string;
  side: string;
  amount: number;
  locked_at: string;
};

export function MarketCard({ market }: { market: Market }) {
  const { session, loading } = useSession();
  const [side, setSide] = useState<"YES" | "NO" | null>(null);
  const [confidence, setConfidence] = useState(100);
  const [locked, setLocked] = useState<LockedRow | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [open, setOpen] = useState(false);
  const dragging = useRef(false);
  const track = useRef<HTMLDivElement>(null);

  const lockFn = useServerFn(lockPrediction);
  const listFn = useServerFn(listMyPredictions);

  // Load any existing (permanent) lock for this market.
  useEffect(() => {
    if (!session) {
      setLocked(null);
      return;
    }
    let active = true;
    listFn({})
      .then((rows) => {
        if (!active) return;
        const mine = (rows as Array<LockedRow & { market_id: string }>).find(
          (r) => r.market_id === market.id,
        );
        if (mine) setLocked(mine);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [session, market.id, listFn]);

  const move = (clientX: number) => {
    if (!dragging.current || !track.current) return;
    const r = track.current.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (clientX - r.left) / (r.width - 48)));
    setProgress(p);
    if (p > 0.92) {
      dragging.current = false;
      setProgress(1);
      setConfirming(true);
    }
  };

  const reset = () => {
    if (locked) return;
    setSide(null);
    setProgress(0);
    setConfirming(false);
  };

  const submit = async () => {
    if (!side || submitting) return;
    setSubmitting(true);
    try {
      const row = await lockFn({
        data: {
          marketId: market.id,
          question: market.question,
          side,
          amount: confidence,
        },
      });
      setLocked(row as LockedRow);
      setConfirming(false);
      toast.success(`Locked permanently · ${(row as LockedRow).reference_id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not lock your prediction.");
      setProgress(0);
    } finally {
      setSubmitting(false);
    }
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

      {locked ? (
        <div className="mt-5 rounded-xl border border-campus-secondary/40 bg-white/4 p-4">
          <div className="flex items-center justify-between">
            <span className="label flex items-center gap-1.5 text-campus-secondary">
              <Lock className="h-3.5 w-3.5" /> Locked · Final
            </span>
            <span className="font-mono text-[0.7rem] text-muted-foreground">
              {locked.reference_id}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="label">Side</p>
              <p className="mt-1 font-mono">{locked.side}</p>
            </div>
            <div>
              <p className="label">Amount</p>
              <p className="mt-1 font-mono">{locked.amount}</p>
            </div>
            <div>
              <p className="label">Locked at</p>
              <p className="mt-1 font-mono text-xs">
                {new Date(locked.locked_at).toLocaleString()}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            This prediction and amount are permanent. They cannot be edited, increased, decreased,
            canceled or transferred.
          </p>
        </div>
      ) : loading ? (
        <div className="mt-5 h-12 animate-pulse rounded-xl bg-white/5" />
      ) : !session ? (
        <div className="mt-5 rounded-xl border border-hairline bg-white/3 p-4">
          <p className="flex items-center gap-2 text-sm text-foreground">
            <ShieldCheck className="h-4 w-4 text-campus-secondary" /> Verified students only
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Sign in with your official college (.edu) email to see and place predictions.
          </p>
          <Link to="/auth" className="ghost-btn mt-4 block py-3 text-center text-foreground">
            Sign in with .edu email
          </Link>
        </div>
      ) : !side ? (
        <div className="mt-5 grid grid-cols-2 gap-3">
          {(["YES", "NO"] as const).map((s) => (
            <button key={s} onClick={() => setSide(s)} className="ghost-btn py-3.5 text-foreground">
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

          <p className="label mt-4">Your amount</p>
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
              dragging.current = true;
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            }}
            onPointerMove={(e) => move(e.clientX)}
            onPointerUp={() => {
              dragging.current = false;
              if (!confirming) setProgress(0);
            }}
            className="relative mt-4 h-14 select-none overflow-hidden rounded-xl border border-hairline bg-white/3"
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="label text-foreground">Slide to review · {confidence}</span>
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

          {confirming && (
            <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                <AlertTriangle className="h-4 w-4 text-destructive" /> This is final
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                You are locking <span className="font-mono text-foreground">{side}</span> with{" "}
                <span className="font-mono text-foreground">{confidence}</span> coins. Once
                confirmed, the decision and the amount are permanent — they cannot be changed,
                increased, decreased, canceled or transferred.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setConfirming(false);
                    setProgress(0);
                  }}
                  className="ghost-btn py-3 text-muted-foreground"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={submit}
                  disabled={submitting}
                  className="ghost-btn flex items-center justify-center gap-2 border-campus-secondary/60 bg-white/6 py-3 text-foreground disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Lock permanently
                </button>
              </div>
            </div>
          )}
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
