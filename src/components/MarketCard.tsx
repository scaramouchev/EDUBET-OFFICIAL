import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, X, AlertTriangle, Loader2, ShieldCheck, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/lib/session";
import { lockPrediction, listMyPredictions } from "@/lib/predictions.functions";
import type { MarketRow } from "@/lib/markets.functions";
import { formatOdds, impliedPercent, payoutFor, profitFor } from "@/lib/odds";

type LockedRow = {
  reference_id: string;
  market_id: string;
  side: string;
  amount: number;
  locked_at: string;
  outcome?: string | null;
};

function closesIn(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "CLOSED";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${String(h).padStart(2, "0")}H ${String(m).padStart(2, "0")}M`;
}

export function MarketCard({ market, balance }: { market: MarketRow; balance?: number }) {
  const { session, loading } = useSession();
  const qc = useQueryClient();
  const [side, setSide] = useState<"YES" | "NO" | null>(null);
  const [amount, setAmount] = useState(50);
  const [confirming, setConfirming] = useState(false);
  const [open, setOpen] = useState(false);

  const lockFn = useServerFn(lockPrediction);
  const listFn = useServerFn(listMyPredictions);

  const { data: mine } = useQuery({
    queryKey: ["my-predictions"],
    queryFn: () => listFn({}) as Promise<LockedRow[]>,
    enabled: !!session,
  });
  const locked = useMemo(
    () => (mine ?? []).find((r) => r.market_id === market.id) ?? null,
    [mine, market.id],
  );

  const max = Math.max(10, Math.min(1000, balance ?? 1000));
  useEffect(() => {
    setAmount((a) => Math.min(a, max));
  }, [max]);

  const odds = side === "NO" ? market.no_odds : market.yes_odds;
  const yesPct = impliedPercent(market.yes_odds);
  const closed = market.status !== "open" || new Date(market.closes_at).getTime() <= Date.now();

  const lock = useMutation({
    mutationFn: () =>
      lockFn({
        data: {
          marketId: market.id,
          question: market.question,
          side: side!,
          amount,
          ...(market.campus ? { campus: market.campus } : {}),
        },
      }),
    onSuccess: (row: any) => {
      setConfirming(false);
      setSide(null);
      qc.invalidateQueries({ queryKey: ["my-predictions"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
      toast.success(`Locked permanently · ${row.reference_id}`);
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Could not lock your prediction."),
  });

  return (
    <article className="panel grain relative overflow-hidden p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="label">{market.category}</span>
        <span className="label">{closesIn(market.closes_at)}</span>
      </div>

      <h3 className="text-xl font-medium leading-snug tracking-tight sm:text-[1.35rem]">
        {market.question}
      </h3>
      {market.detail && (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{market.detail}</p>
      )}

      <div className="mt-5 flex items-baseline justify-between">
        <span className="label">Yes</span>
        <span className="font-mono text-sm text-campus-secondary">{yesPct}%</span>
      </div>
      <div className="mt-2 h-[3px] w-full rounded-full bg-white/8">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{
            width: `${yesPct}%`,
            background: `linear-gradient(90deg, var(--campus-primary), var(--campus-secondary))`,
          }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="label flex items-center gap-1">
          <TrendingUp className="h-3 w-3" /> Yes {formatOdds(market.yes_odds)} · No{" "}
          {formatOdds(market.no_odds)}
        </span>
        <span className="label text-campus-secondary/80">
          +{market.sweepstakes_entries_reward} entry on win
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
            {locked.outcome
              ? `Settled · ${locked.outcome}`
              : `If ${locked.side} hits you receive ${payoutFor(
                  locked.amount,
                  locked.side === "NO" ? market.no_odds : market.yes_odds,
                )} coins.`}{" "}
            This prediction and amount are permanent — they cannot be edited, increased, decreased,
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
      ) : closed ? (
        <p className="mt-5 rounded-xl border border-hairline bg-white/3 p-4 text-sm text-muted-foreground">
          This market is closed for new predictions.
        </p>
      ) : !side ? (
        <div className="mt-5 grid grid-cols-2 gap-3">
          {(["YES", "NO"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSide(s)}
              className="ghost-btn flex flex-col items-center gap-1 py-3 text-foreground"
            >
              <span>{s}</span>
              <span className="font-mono text-xs text-campus-secondary">
                {formatOdds(s === "YES" ? market.yes_odds : market.no_odds)}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-5">
          <div className="flex items-center justify-between">
            <span className="label text-foreground">
              You · {side} {formatOdds(odds)}
            </span>
            <button
              onClick={() => {
                setSide(null);
                setConfirming(false);
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 flex items-baseline justify-between">
            <span className="label">Your amount</span>
            <span className="font-mono text-lg">{amount}</span>
          </div>
          <input
            type="range"
            min={10}
            max={max}
            step={5}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[var(--campus-secondary)]"
          />
          <div className="label mt-1 flex justify-between">
            <span>10</span>
            <span>{max} max</span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-hairline bg-white/3 p-4 text-sm">
            <div>
              <p className="label">You'd win</p>
              <p className="mt-1 font-mono text-lg text-campus-secondary">
                +{profitFor(amount, odds)}
              </p>
            </div>
            <div className="text-right">
              <p className="label">Total returned</p>
              <p className="mt-1 font-mono text-lg">{payoutFor(amount, odds)}</p>
            </div>
          </div>

          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              className="ghost-btn mt-4 w-full border-campus-secondary/60 bg-white/6 py-3.5 text-foreground"
            >
              Review lock · {amount} coins
            </button>
          ) : (
            <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                <AlertTriangle className="h-4 w-4 text-destructive" /> This is final
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                You are locking <span className="font-mono text-foreground">{side}</span> at{" "}
                <span className="font-mono text-foreground">{formatOdds(odds)}</span> with{" "}
                <span className="font-mono text-foreground">{amount}</span> coins to win{" "}
                <span className="font-mono text-foreground">+{profitFor(amount, odds)}</span>. Once
                confirmed, the decision and the amount are permanent — they cannot be changed,
                increased, decreased, canceled or transferred.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={() => setConfirming(false)}
                  className="ghost-btn py-3 text-muted-foreground"
                  disabled={lock.isPending}
                >
                  Cancel
                </button>
                <button
                  onClick={() => lock.mutate()}
                  disabled={lock.isPending}
                  className="ghost-btn flex items-center justify-center gap-2 border-campus-secondary/60 bg-white/6 py-3 text-foreground disabled:opacity-50"
                >
                  {lock.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
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
          Winning locks are credited at the posted odds and earn sweepstakes entries. Disputed
          outcomes go to a moderator review queue.
        </p>
      )}
    </article>
  );
}
