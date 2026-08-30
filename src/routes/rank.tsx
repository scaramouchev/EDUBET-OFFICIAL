import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BottomNav, TopBar } from "@/components/Chrome";
import { getStoredCampus, type CampusId } from "@/lib/campus";

export const Route = createFileRoute("/rank")({
  head: () => ({
    meta: [
      { title: "Campus Rank — EduBet" },
      {
        name: "description",
        content: "The campus leaderboard: accuracy, streaks, and who is calling it right this week.",
      },
      { property: "og:title", content: "Campus Rank — EduBet" },
      { property: "og:description", content: "Accuracy, streaks, and campus standing." },
    ],
  }),
  component: Rank,
});

const BOARD = [
  { n: "nolegoose", acc: 78, streak: 11, pts: 4820 },
  { n: "landis.enjoyer", acc: 74, streak: 7, pts: 4410 },
  { n: "sga_insider", acc: 71, streak: 4, pts: 3980 },
  { n: "strozier3am", acc: 69, streak: 9, pts: 3705 },
  { n: "tally.tempo", acc: 66, streak: 2, pts: 3390 },
  { n: "you", acc: 63, streak: 3, pts: 3120 },
];

function Rank() {
  const [campus, setCampus] = useState<CampusId>("fsu");
  useEffect(() => setCampus(getStoredCampus()), []);

  return (
    <div data-campus={campus} className="void-field min-h-screen">
      <TopBar campus={campus} />
      <main className="mx-auto max-w-3xl px-5 pb-32 pt-10">
        <p className="label">This week</p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight">Campus rank.</h1>

        <section className="panel mt-6 divide-y divide-white/6">
          {BOARD.map((r, i) => (
            <div
              key={r.n}
              className={`flex items-center gap-4 px-5 py-4 ${r.n === "you" ? "bg-white/4" : ""}`}
            >
              <span className="w-6 font-mono text-xs text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 text-sm">{r.n}</span>
              <span className="label">{r.acc}% ACC</span>
              <span className="label text-campus-secondary/80">{r.streak}🔥</span>
              <span className="w-16 text-right font-mono text-xs">{r.pts}</span>
            </div>
          ))}
        </section>
      </main>
      <BottomNav />
    </div>
  );
}
