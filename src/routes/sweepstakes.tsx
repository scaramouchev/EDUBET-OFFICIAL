import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Gift, Loader2, Ticket, Trophy } from "lucide-react";
import { toast } from "sonner";
import { BottomNav, TopBar } from "@/components/Chrome";
import { WalletPanel, useWallet } from "@/components/Wallet";
import { CAMPUSES, getStoredCampus, type CampusId } from "@/lib/campus";
import { useSession } from "@/lib/session";
import { enterSweepstakes, listSweepstakes, myEntries } from "@/lib/markets.functions";

export const Route = createFileRoute("/sweepstakes")({
  head: () => ({
    meta: [
      { title: "Campus sweepstakes — EduBet" },
      {
        name: "description",
        content:
          "Spend the entries you earn from winning predictions on campus sweepstakes prizes and see when the next draw happens.",
      },
      { property: "og:title", content: "Campus sweepstakes — EduBet" },
      {
        property: "og:description",
        content: "Turn winning predictions into entries for campus prize draws.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SweepstakesPage,
});

type Sweep = {
  id: string;
  campus: CampusId | null;
  title: string;
  prize: string;
  description: string | null;
  entry_cost: number;
  draws_at: string;
  status: string;
  drawn_at: string | null;
};

function SweepstakesPage() {
  const [campus, setCampus] = useState<CampusId>("fsu");
  useEffect(() => setCampus(getStoredCampus()), []);
  const c = CAMPUSES.find((x) => x.id === campus)!;

  const { session } = useSession();
  const qc = useQueryClient();
  const listFn = useServerFn(listSweepstakes);
  const mineFn = useServerFn(myEntries);
  const enterFn = useServerFn(enterSweepstakes);
  const { data: wallet } = useWallet();

  const { data: sweeps, isLoading } = useQuery({
    queryKey: ["sweepstakes"],
    queryFn: () => listFn({}) as Promise<Sweep[]>,
  });
  const { data: mine } = useQuery({
    queryKey: ["my-entries"],
    queryFn: () => mineFn({}) as Promise<Array<{ sweepstakes_id: string; entries: number }>>,
    enabled: !!session,
  });

  const [pending, setPending] = useState<string | null>(null);
  const enter = useMutation({
    mutationFn: (v: { id: string; entries: number }) =>
      enterFn({ data: { sweepstakesId: v.id, entries: v.entries } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["my-entries"] });
      toast.success("Entry submitted. Good luck at the draw.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not enter."),
    onSettled: () => setPending(null),
  });

  const visible = (sweeps ?? []).filter((s) => !s.campus || s.campus === campus);

  return (
    <div data-campus={campus} className="void-field min-h-screen">
      <TopBar campus={campus} />
      <main className="mx-auto max-w-3xl px-5 pb-32 pt-10">
        <p className="label">Sweepstakes · {c.short}</p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight">
          Win predictions. Earn entries. Take the prize.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Every winning locked prediction pays coins at the posted odds and earns sweepstakes
          entries. Spend those entries here — no purchase, no cash stake.
        </p>

        <WalletPanel />

        {!session && (
          <div className="panel mt-6 p-5">
            <p className="text-sm text-foreground">Sign in to enter</p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Entries are tied to your verified campus account.
            </p>
            <Link to="/auth" className="ghost-btn mt-4 inline-block px-6 py-3 text-foreground">
              Sign in with .edu email
            </Link>
          </div>
        )}

        <div className="mt-10 flex items-center justify-between">
          <span className="label">Open draws</span>
          <span className="label">{visible.length} Prizes</span>
        </div>

        <div className="mt-4 space-y-5">
          {isLoading && <div className="panel h-40 animate-pulse" />}
          {!isLoading && visible.length === 0 && (
            <p className="panel p-6 text-sm text-muted-foreground">
              No draws are open for {c.short} right now. Check back after this week's markets
              settle.
            </p>
          )}
          {visible.map((s) => {
            const owned = (mine ?? []).find((m) => m.sweepstakes_id === s.id)?.entries ?? 0;
            const affordable = (wallet?.entries ?? 0) >= s.entry_cost;
            const closed = s.status === "closed" || s.status === "drawing";
            return (
              <article key={s.id} className="panel grain p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <span className="label flex items-center gap-1.5">
                    <Gift className="h-3.5 w-3.5 text-campus-secondary" /> {s.campus ? s.campus.toUpperCase() : "All campuses"}
                  </span>
                  <span className="label">
                    Draws {new Date(s.draws_at).toLocaleDateString()}
                  </span>
                </div>

                <h2 className="mt-4 text-xl font-medium tracking-tight">{s.title}</h2>
                <p className="mt-1.5 flex items-center gap-2 text-sm text-campus-secondary">
                  <Trophy className="h-4 w-4" /> {s.prize}
                </p>
                {s.description && (
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {s.description}
                  </p>
                )}

                <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="label">Entry cost</p>
                    <p className="mt-1 font-mono">{s.entry_cost}</p>
                  </div>
                  <div>
                    <p className="label">Your entries</p>
                    <p className="mt-1 font-mono">{owned}</p>
                  </div>
                  <div>
                    <p className="label">Status</p>
                    <p className="mt-1 font-mono uppercase">{s.status}</p>
                  </div>
                </div>

                {session && (
                  <button
                    disabled={!affordable || closed || pending === s.id}
                    onClick={() => {
                      setPending(s.id);
                      enter.mutate({ id: s.id, entries: s.entry_cost });
                    }}
                    className="ghost-btn mt-5 flex w-full items-center justify-center gap-2 border-campus-secondary/60 bg-white/6 py-3.5 text-foreground disabled:opacity-40"
                  >
                    {pending === s.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Ticket className="h-4 w-4" />
                    )}
                    {closed
                      ? "Draw closed"
                      : affordable
                        ? `Use ${s.entry_cost} entry${s.entry_cost > 1 ? "s" : ""}`
                        : "Win a prediction to earn entries"}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
