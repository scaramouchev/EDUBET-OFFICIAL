import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Clock } from "lucide-react";
import { BottomNav, TopBar } from "@/components/Chrome";
import { CAMPUSES, getStoredCampus, type CampusId } from "@/lib/campus";
import { listMarkets, type MarketRow } from "@/lib/markets.functions";
import { formatOdds, impliedPercent } from "@/lib/odds";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Upcoming markets calendar — EduBet" },
      {
        name: "description",
        content:
          "See every upcoming campus prediction market for FSU, UF and FAMU by date, with odds and closing times, before you lock anything in.",
      },
      { property: "og:title", content: "Upcoming markets calendar — EduBet" },
      {
        property: "og:description",
        content: "Every upcoming campus market by date, with odds and closing times.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CalendarPage,
});

type Filter = CampusId | "all";

function dayKey(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function CalendarPage() {
  const [campus, setCampus] = useState<CampusId>("fsu");
  const [filter, setFilter] = useState<Filter>("all");
  useEffect(() => setCampus(getStoredCampus()), []);

  const listFn = useServerFn(listMarkets);
  const { data: markets, isLoading } = useQuery({
    queryKey: ["markets", "all"],
    queryFn: () => listFn({ data: {} }) as Promise<MarketRow[]>,
  });

  const groups = useMemo(() => {
    const now = Date.now();
    const rows = (markets ?? [])
      .filter((m) => m.status === "open" && new Date(m.closes_at).getTime() > now)
      .filter((m) => filter === "all" || !m.campus || m.campus === filter)
      .sort((a, b) => +new Date(a.closes_at) - +new Date(b.closes_at));

    const out: { day: string; items: MarketRow[] }[] = [];
    for (const m of rows) {
      const key = dayKey(m.closes_at);
      const last = out[out.length - 1];
      if (last && last.day === key) last.items.push(m);
      else out.push({ day: key, items: [m] });
    }
    return out;
  }, [markets, filter]);

  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div data-campus={campus} className="void-field min-h-screen">
      <TopBar campus={campus} />
      <main className="mx-auto max-w-3xl px-5 pb-32 pt-10">
        <p className="label flex items-center gap-2">
          <CalendarDays className="h-3.5 w-3.5 text-campus-secondary" /> Calendar
        </p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight">What&apos;s betting this week.</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Every open market, ordered by when it closes. Browse freely — nothing is locked until you
          confirm it on the market itself.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {(["all", ...CAMPUSES.map((c) => c.id)] as Filter[]).map((f) => {
            const label = f === "all" ? "All campuses" : CAMPUSES.find((c) => c.id === f)!.short;
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`ghost-btn px-4 py-2 text-xs tracking-wide ${
                  active ? "border-campus-secondary/60 bg-white/8 text-foreground" : "text-muted-foreground"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex items-center justify-between">
          <span className="label">Upcoming</span>
          <span className="label">{total} Markets</span>
        </div>

        <div className="mt-4 space-y-8">
          {isLoading && <div className="panel h-40 animate-pulse" />}
          {!isLoading && total === 0 && (
            <p className="panel p-6 text-sm text-muted-foreground">
              Nothing is scheduled here yet. New markets appear as campus events get added.
            </p>
          )}

          {groups.map((g) => (
            <section key={g.day}>
              <h2 className="label sticky top-14 z-10 bg-background/70 py-2 backdrop-blur-xl">
                {g.day}
              </h2>
              <ul className="mt-2 space-y-3">
                {g.items.map((m) => (
                  <li key={m.id} className="panel grain p-5">
                    <div className="flex items-center justify-between">
                      <span className="label">
                        {m.campus ? m.campus.toUpperCase() : "All campuses"} · {m.category}
                      </span>
                      <span className="label flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" /> Closes {timeOf(m.closes_at)}
                      </span>
                    </div>

                    <p className="mt-3 text-base leading-snug text-foreground">{m.question}</p>
                    {m.detail && (
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {m.detail}
                      </p>
                    )}

                    <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="label">Yes</p>
                        <p className="mt-1 font-mono">{formatOdds(m.yes_odds)}</p>
                      </div>
                      <div>
                        <p className="label">No</p>
                        <p className="mt-1 font-mono">{formatOdds(m.no_odds)}</p>
                      </div>
                      <div>
                        <p className="label">Yes chance</p>
                        <p className="mt-1 font-mono">{impliedPercent(m.yes_odds)}%</p>
                      </div>
                    </div>

                    <Link
                      to="/home"
                      className="ghost-btn mt-5 inline-block px-5 py-2.5 text-xs text-foreground"
                    >
                      Open on the feed
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
