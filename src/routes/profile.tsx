import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { BottomNav, TopBar } from "@/components/Chrome";
import { WalletPanel } from "@/components/Wallet";
import { CAMPUSES, getStoredCampus, type CampusId } from "@/lib/campus";
import { useSession } from "@/lib/session";
import { listMyPredictions } from "@/lib/predictions.functions";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — EduBet" },
      {
        name: "description",
        content: "Your prediction record: accuracy, streak, campus standing, and open positions.",
      },
      { property: "og:title", content: "Your profile — EduBet" },
      { property: "og:description", content: "Your prediction record and campus standing." },
    ],
  }),
  component: Profile,
});

function Profile() {
  const [campus, setCampus] = useState<CampusId>("fsu");
  useEffect(() => setCampus(getStoredCampus()), []);
  const c = CAMPUSES.find((x) => x.id === campus)!;
  const { session } = useSession();

  const predictionsFn = useServerFn(listMyPredictions);
  const { data: predictions, isLoading: predictionsLoading } = useQuery({
    queryKey: ["my-predictions"],
    queryFn: () => predictionsFn({}),
    enabled: !!session,
  });

  return (
    <div data-campus={campus} className="void-field min-h-screen">
      <TopBar campus={campus} />
      <main className="mx-auto max-w-3xl px-5 pb-32 pt-10">
        <p className="label">Profile</p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight">you · {c.short}</h1>

        <WalletPanel />

        <section className="panel mt-6 grid grid-cols-2 gap-6 p-6 sm:grid-cols-4">
          {[
            ["Accuracy", "63%"],
            ["Streak", "3"],
            ["Rank", "#06"],
            ["Points", "3,120"],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="label">{k}</p>
              <p className="mt-1 font-mono text-lg tracking-widest">{v}</p>
            </div>
          ))}
        </section>

        <section className="panel mt-5 p-6">
          <div className="flex items-center justify-between">
            <p className="label">Locked positions</p>
            <span className="label text-muted-foreground">
              {predictions?.length ?? 0} active
            </span>
          </div>

          {!session && (
            <p className="mt-4 text-sm text-muted-foreground">
              Sign in with your .edu email to see your locked predictions.
            </p>
          )}

          {session && predictionsLoading && (
            <div className="mt-4 h-24 animate-pulse rounded-xl bg-muted" />
          )}

          {session && !predictionsLoading && (predictions?.length ?? 0) === 0 && (
            <p className="mt-4 text-sm text-muted-foreground">
              No locked positions yet. Browse the home feed to lock your first prediction.
            </p>
          )}

          {session && !predictionsLoading && (predictions?.length ?? 0) > 0 && (
            <ul className="mt-4 space-y-4">
              {predictions!.map((p) => (
                <li key={p.reference_id} className="text-sm">
                  <div className="flex items-center justify-between">
                    <span className="line-clamp-1 pr-3 text-foreground/90">
                      {p.market_question}
                    </span>
                    <span className="label shrink-0 text-campus-secondary/80">
                      {p.side} · {p.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Ref {p.reference_id}</span>
                    <span>{new Date(p.locked_at).toLocaleDateString()}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <Link to="/campus" className="ghost-btn mt-6 inline-block px-6 py-3 text-foreground">
          Switch campus →
        </Link>
      </main>
      <BottomNav />
    </div>
  );
}
