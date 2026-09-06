import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Coins, Ticket } from "lucide-react";
import { useSession } from "@/lib/session";
import { getMyWallet } from "@/lib/markets.functions";

export type WalletData = {
  balance: number;
  entries: number;
  lifetimeWon: number;
  lifetimeStaked: number;
  ledger: Array<{
    delta: number;
    entries_delta: number;
    reason: string;
    reference: string | null;
    balance_after: number;
    created_at: string;
  }>;
};

export function useWallet() {
  const { session } = useSession();
  const walletFn = useServerFn(getMyWallet);
  return useQuery({
    queryKey: ["wallet"],
    queryFn: () => walletFn({}) as Promise<WalletData>,
    enabled: !!session,
  });
}

/** Compact balance pill, for the top bar. */
export function BalancePill() {
  const { data } = useWallet();
  if (!data) return null;
  return (
    <Link
      to="/sweepstakes"
      className="flex items-center gap-3 rounded-full border border-hairline px-3 py-1 font-mono text-xs text-foreground"
    >
      <span className="flex items-center gap-1.5">
        <Coins className="h-3.5 w-3.5 text-campus-secondary" />
        {data.balance.toLocaleString()}
      </span>
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <Ticket className="h-3.5 w-3.5" />
        {data.entries}
      </span>
    </Link>
  );
}

/** Full wallet panel with recent coin activity. */
export function WalletPanel() {
  const { session } = useSession();
  const { data, isLoading } = useWallet();

  if (!session) return null;
  if (isLoading || !data) return <div className="panel mt-6 h-32 animate-pulse" />;

  return (
    <section className="panel mt-6 p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <span className="label flex items-center gap-2">
          <Coins className="h-3.5 w-3.5 text-campus-secondary" /> Campus wallet
        </span>
        <Link to="/sweepstakes" className="label hover:text-foreground">
          Sweepstakes →
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ["Coins", data.balance.toLocaleString()],
          ["Entries", String(data.entries)],
          ["Won", `+${data.lifetimeWon.toLocaleString()}`],
          ["Staked", data.lifetimeStaked.toLocaleString()],
        ].map(([k, v]) => (
          <div key={k}>
            <p className="label">{k}</p>
            <p className="mt-1 font-mono text-lg tracking-widest">{v}</p>
          </div>
        ))}
      </div>

      {data.ledger.length > 0 && (
        <ul className="mt-6 space-y-3 border-t border-hairline pt-4">
          {data.ledger.slice(0, 6).map((l, i) => (
            <li key={i} className="flex items-center justify-between text-sm">
              <span className="text-foreground/90">{l.reason}</span>
              <span
                className={`font-mono text-xs ${
                  l.delta >= 0 ? "text-campus-secondary" : "text-muted-foreground"
                }`}
              >
                {l.delta >= 0 ? "+" : ""}
                {l.delta}
                {l.entries_delta ? ` · +${l.entries_delta} entry` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
