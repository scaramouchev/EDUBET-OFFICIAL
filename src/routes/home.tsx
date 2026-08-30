import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BottomNav, CampusToast, TopBar } from "@/components/Chrome";
import { MarketCard } from "@/components/MarketCard";
import { CAMPUSES, MARKETS, getStoredCampus, type CampusId } from "@/lib/campus";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Your campus right now — EduBet" },
      {
        name: "description",
        content:
          "Live campus activity, trending prediction markets, and what students are voting on today.",
      },
      { property: "og:title", content: "Your campus right now — EduBet" },
      {
        property: "og:description",
        content: "Live campus activity and trending prediction markets.",
      },
    ],
  }),
  component: HomeFeed,
});

const PULSE = [
  { label: "Rivalry predictions surging", delta: "+281%" },
  { label: "821 students voting on today's Pulse", delta: "" },
  { label: "SGA market trending", delta: "+42%" },
  { label: "Library discussion", delta: "+241%" },
  { label: "Campus Chaos #1: Goose", delta: "" },
];

function HomeFeed() {
  const [campus, setCampus] = useState<CampusId>("fsu");
  const [time, setTime] = useState("");

  useEffect(() => {
    setCampus(getStoredCampus());
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    tick();
    const i = setInterval(tick, 30_000);
    return () => clearInterval(i);
  }, []);

  const c = CAMPUSES.find((x) => x.id === campus)!;

  return (
    <div data-campus={campus} className="void-field min-h-screen">
      <TopBar campus={campus} />
      <CampusToast campus={campus} />

      <main className="mx-auto max-w-3xl px-5 pb-32 pt-10">
        <p className="label">Good morning</p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight">Here's your campus.</h1>

        <section className="panel mt-6 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <span className="label flex items-center gap-2">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-campus-secondary" />
              Campus now · {c.short}
            </span>
            <span className="label">{time}</span>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-4">
            {[
              ["Activity", "HIGH"],
              ["Active", "4,857"],
              ["Pred / Min", "137"],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="label">{k}</p>
                <p className="mt-1 font-mono text-lg tracking-widest">{v}</p>
              </div>
            ))}
          </div>

          <ul className="mt-6 space-y-3">
            {PULSE.map((p) => (
              <li key={p.label} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-3 text-foreground/90">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: "color-mix(in oklab, var(--campus-primary) 80%, white)" }}
                  />
                  {p.label}
                </span>
                {p.delta && (
                  <span className="font-mono text-[0.7rem] text-campus-secondary/80">{p.delta}</span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-10 flex items-center justify-between">
          <span className="label">Trending · {c.short}</span>
          <span className="label">{MARKETS.length} Markets</span>
        </div>

        <div className="mt-4 space-y-5">
          {MARKETS.map((m) => (
            <MarketCard key={m.id} market={m} />
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
