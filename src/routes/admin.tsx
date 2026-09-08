import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Gavel, Gift, Loader2, RefreshCw, ShieldAlert, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { BottomNav, TopBar } from "@/components/Chrome";
import { CAMPUSES, getStoredCampus, type CampusId } from "@/lib/campus";
import { useSession } from "@/lib/session";
import { formatOdds } from "@/lib/odds";
import {
  createMarketsFromEvents,
  createSweepstakes,
  drawSweepstakes,
  getAdminOverview,
  resolveMarket,
  syncEventFeeds,
} from "@/lib/markets.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin control room — EduBet" },
      {
        name: "description",
        content:
          "Turn campus events into prediction markets, settle results at locked odds, and run campus sweepstakes draws.",
      },
      { property: "og:title", content: "Admin control room — EduBet" },
      {
        property: "og:description",
        content: "Create markets from campus events, settle results, and draw sweepstakes winners.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

const fmt = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

function Section({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: React.ElementType;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-hairline bg-card/60 p-5 backdrop-blur-xl">
      <div className="mb-4 flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
        <div>
          <h2 className="text-sm font-medium">{title}</h2>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function AdminPage() {
  const { session, loading } = useSession();
  const [campus] = useState<CampusId>(() => getStoredCampus());
  const qc = useQueryClient();

  const overviewFn = useServerFn(getAdminOverview);
  const overview = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => overviewFn(),
    enabled: !!session,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-overview"] });

  const makeMarkets = useMutation({
    mutationFn: useServerFn(createMarketsFromEvents),
    onSuccess: (r: { created: number }) => {
      toast.success(`${r.created} market${r.created === 1 ? "" : "s"} opened`);
      setPicked([]);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const settle = useMutation({
    mutationFn: useServerFn(resolveMarket),
    onSuccess: (r: { settled: number; winners: number; paid: number }) => {
      toast.success(`Settled ${r.settled} predictions · ${r.winners} winners paid ${r.paid} coins`);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const draw = useMutation({
    mutationFn: useServerFn(drawSweepstakes),
    onSuccess: () => {
      toast.success("Winner drawn");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const newSweep = useMutation({
    mutationFn: useServerFn(createSweepstakes),
    onSuccess: () => {
      toast.success("Sweepstakes created");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const sync = useMutation({
    mutationFn: useServerFn(syncEventFeeds),
    onSuccess: () => {
      toast.success("Campus calendars synced");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [picked, setPicked] = useState<string[]>([]);
  const [yesOdds, setYesOdds] = useState("+140");
  const [noOdds, setNoOdds] = useState("-140");

  const data = overview.data;
  const events = data?.isAdmin ? data.events : [];
  const markets = data?.isAdmin ? data.markets : [];
  const sweeps = data?.isAdmin ? data.sweepstakes : [];

  const eventIdsWithMarket = useMemo(
    () => new Set(markets.map((m) => (m as { event_id?: string }).event_id).filter(Boolean)),
    [markets],
  );
  const openMarkets = markets.filter((m) => m.status !== "resolved");
  const settled = markets.filter((m) => m.status === "resolved");

  const parseOdds = (v: string) => {
    const n = Number.parseInt(v.replace("+", ""), 10);
    return Number.isFinite(n) ? n : 100;
  };

  if (!loading && !session) {
    return (
      <div className="min-h-dvh pb-28">
        <TopBar campus={campus} />
        <main className="mx-auto max-w-3xl px-5 py-16 text-center">
          <ShieldAlert className="mx-auto h-6 w-6 text-muted-foreground" />
          <h1 className="mt-4 text-lg font-medium">Admin sign-in required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with your administrator college account to run markets and draws.
          </p>
          <Link to="/auth" className="mt-6 inline-block rounded-full bg-foreground px-5 py-2 text-sm text-background">
            Sign in
          </Link>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (overview.isLoading || loading) {
    return (
      <div className="min-h-dvh pb-28">
        <TopBar campus={campus} />
        <div className="flex justify-center py-24">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (data && !data.isAdmin) {
    return (
      <div className="min-h-dvh pb-28">
        <TopBar campus={campus} />
        <main className="mx-auto max-w-3xl px-5 py-16 text-center">
          <ShieldAlert className="mx-auto h-6 w-6 text-muted-foreground" />
          <h1 className="mt-4 text-lg font-medium">This area is for administrators</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account doesn&apos;t have administrator access.
          </p>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-28">
      <TopBar campus={campus} />
      <main className="mx-auto max-w-3xl space-y-5 px-5 py-6">
        <div className="flex items-end justify-between">
          <div>
            <p className="label text-muted-foreground">Control room</p>
            <h1 className="mt-1 text-xl font-medium">Markets, results & draws</h1>
          </div>
          <button
            onClick={() => sync.mutate({ data: undefined } as never)}
            disabled={sync.isPending}
            className="flex items-center gap-2 rounded-full border border-hairline px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            {sync.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Sync calendars
          </button>
        </div>

        {/* Events -> markets */}
        <Section
          icon={CalendarPlus}
          title="Open markets from campus events"
          hint="Pick events from the FSU, FAMU and UF calendars and publish a market for each in one go."
        >
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {events.length === 0 ? (
              <p className="text-xs text-muted-foreground">No campus events yet.</p>
            ) : (
              events.map((e) => {
                const used = eventIdsWithMarket.has(e.id);
                const on = picked.includes(e.id);
                return (
                  <button
                    key={e.id}
                    disabled={used}
                    onClick={() =>
                      setPicked((p) => (p.includes(e.id) ? p.filter((x) => x !== e.id) : [...p, e.id]))
                    }
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      used
                        ? "border-hairline opacity-40"
                        : on
                          ? "border-foreground/40 bg-accent"
                          : "border-hairline hover:bg-accent/50"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm">{e.title}</p>
                      <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
                        {CAMPUSES.find((c) => c.id === e.campus)?.short ?? e.campus} · {e.category} ·{" "}
                        {fmt(e.starts_at)}
                      </p>
                    </div>
                    <span className="label shrink-0 text-muted-foreground">{used ? "Live" : on ? "Picked" : "Add"}</span>
                  </button>
                );
              })
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <label className="text-xs text-muted-foreground">YES</label>
            <input
              value={yesOdds}
              onChange={(e) => setYesOdds(e.target.value)}
              className="w-20 rounded-lg border border-hairline bg-transparent px-2 py-1.5 text-sm"
            />
            <label className="text-xs text-muted-foreground">NO</label>
            <input
              value={noOdds}
              onChange={(e) => setNoOdds(e.target.value)}
              className="w-20 rounded-lg border border-hairline bg-transparent px-2 py-1.5 text-sm"
            />
            <button
              disabled={!picked.length || makeMarkets.isPending}
              onClick={() =>
                makeMarkets.mutate({
                  data: { eventIds: picked, yesOdds: parseOdds(yesOdds), noOdds: parseOdds(noOdds) },
                })
              }
              className="ml-auto flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm text-background disabled:opacity-40"
            >
              {makeMarkets.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Open {picked.length || ""} market{picked.length === 1 ? "" : "s"}
            </button>
          </div>
        </Section>

        {/* Settle */}
        <Section
          icon={Gavel}
          title="Settle results"
          hint="Settling pays every winning prediction at the odds locked in at the time. It can only be done once."
        >
          <div className="space-y-2">
            {openMarkets.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nothing waiting to be settled.</p>
            ) : (
              openMarkets.map((m) => (
                <div key={m.id} className="rounded-xl border border-hairline px-3 py-3">
                  <p className="text-sm">{m.question}</p>
                  <p className="mt-1 text-[0.7rem] text-muted-foreground">
                    {m.category} · YES {formatOdds(m.yes_odds)} / NO {formatOdds(m.no_odds)} · closes {fmt(m.closes_at)}
                  </p>
                  <div className="mt-3 flex gap-2">
                    {(["YES", "NO"] as const).map((side) => (
                      <button
                        key={side}
                        disabled={settle.isPending}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Settle "${m.question}" as ${side}? Payouts are final and cannot be reversed.`,
                            )
                          )
                            settle.mutate({ data: { marketId: m.id, outcome: side } });
                        }}
                        className="flex-1 rounded-lg border border-hairline py-2 text-xs hover:bg-accent"
                      >
                        Settle {side}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
          {settled.length > 0 ? (
            <div className="mt-4 space-y-1.5 border-t border-hairline pt-3">
              {settled.slice(0, 6).map((m) => (
                <p key={m.id} className="truncate text-[0.7rem] text-muted-foreground">
                  {m.outcome} · {m.question}
                </p>
              ))}
            </div>
          ) : null}
        </Section>

        {/* Sweepstakes */}
        <Section icon={Gift} title="Sweepstakes draws" hint="Winners are picked at random, weighted by entries.">
          <form
            className="mb-4 grid gap-2 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const campusVal = String(f.get("campus") ?? "");
              newSweep.mutate({
                data: {
                  title: String(f.get("title") ?? ""),
                  prize: String(f.get("prize") ?? ""),
                  ...(campusVal ? { campus: campusVal } : {}),
                  entryCost: Number(f.get("entryCost") ?? 1),
                  drawsAt: String(f.get("drawsAt") ?? ""),
                },
              });
              e.currentTarget.reset();
            }}
          >
            <input name="title" required placeholder="Drawing name" className="rounded-lg border border-hairline bg-transparent px-3 py-2 text-sm" />
            <input name="prize" required placeholder="Prize" className="rounded-lg border border-hairline bg-transparent px-3 py-2 text-sm" />
            <select name="campus" className="rounded-lg border border-hairline bg-transparent px-3 py-2 text-sm">
              <option value="">All campuses</option>
              {CAMPUSES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.short}
                </option>
              ))}
            </select>
            <input name="entryCost" type="number" min={1} defaultValue={1} className="rounded-lg border border-hairline bg-transparent px-3 py-2 text-sm" />
            <input name="drawsAt" type="datetime-local" required className="rounded-lg border border-hairline bg-transparent px-3 py-2 text-sm" />
            <button
              type="submit"
              disabled={newSweep.isPending}
              className="rounded-lg bg-foreground px-4 py-2 text-sm text-background disabled:opacity-40"
            >
              Create drawing
            </button>
          </form>

          <div className="space-y-2">
            {sweeps.length === 0 ? (
              <p className="text-xs text-muted-foreground">No drawings yet.</p>
            ) : (
              sweeps.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-hairline px-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{s.title}</p>
                    <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
                      {s.prize} · {s.total_entries} entries · draws {fmt(s.draws_at)}
                    </p>
                    {s.winner_label ? (
                      <p className="mt-1 text-[0.7rem] text-foreground">Winner · {s.winner_label}</p>
                    ) : null}
                  </div>
                  <button
                    disabled={!!s.winner_user_id || draw.isPending}
                    onClick={() => {
                      if (window.confirm(`Draw a winner for "${s.title}"? This is final.`))
                        draw.mutate({ data: { sweepstakesId: s.id } });
                    }}
                    className="shrink-0 rounded-full border border-hairline px-3 py-1.5 text-xs disabled:opacity-40"
                  >
                    {s.winner_user_id ? "Drawn" : "Draw winner"}
                  </button>
                </div>
              ))
            )}
          </div>
        </Section>
      </main>
      <BottomNav />
    </div>
  );
}
