import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BottomNav, TopBar } from "@/components/Chrome";
import { getStoredCampus, type CampusId } from "@/lib/campus";

export const Route = createFileRoute("/pulse")({
  head: () => ({
    meta: [
      { title: "Campus Pulse — EduBet" },
      {
        name: "description",
        content: "One question a day. See how your campus is really feeling in real time.",
      },
      { property: "og:title", content: "Campus Pulse — EduBet" },
      { property: "og:description", content: "One question a day, answered by your whole campus." },
    ],
  }),
  component: Pulse,
});

const OPTIONS = [
  { label: "Strozier", pct: 46 },
  { label: "Dirac", pct: 31 },
  { label: "My dorm", pct: 15 },
  { label: "Not studying", pct: 8 },
];

function Pulse() {
  const [campus, setCampus] = useState<CampusId>("fsu");
  const [voted, setVoted] = useState<string | null>(null);
  useEffect(() => setCampus(getStoredCampus()), []);

  return (
    <div data-campus={campus} className="void-field min-h-screen">
      <TopBar campus={campus} />
      <main className="mx-auto max-w-3xl px-5 pb-32 pt-10">
        <p className="label">Today's pulse</p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight">Where are you studying tonight?</h1>

        <section className="panel mt-6 space-y-3 p-5 sm:p-6">
          {OPTIONS.map((o) => (
            <button
              key={o.label}
              onClick={() => setVoted(o.label)}
              className="relative block w-full overflow-hidden rounded-lg border border-hairline px-4 py-3.5 text-left"
            >
              {voted && (
                <span
                  className="absolute inset-y-0 left-0 opacity-30"
                  style={{
                    width: `${o.pct}%`,
                    background: "linear-gradient(90deg, var(--campus-primary), var(--campus-secondary))",
                  }}
                />
              )}
              <span className="relative flex items-center justify-between text-sm">
                <span className={voted === o.label ? "text-foreground" : "text-foreground/85"}>
                  {o.label}
                </span>
                {voted && <span className="font-mono text-xs text-campus-secondary">{o.pct}%</span>}
              </span>
            </button>
          ))}
          <p className="label pt-2">{voted ? "821 students voted" : "Vote to see results"}</p>
        </section>
      </main>
      <BottomNav />
    </div>
  );
}
