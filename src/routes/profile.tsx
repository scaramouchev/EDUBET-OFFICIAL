import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BottomNav, TopBar } from "@/components/Chrome";
import { CAMPUSES, getStoredCampus, type CampusId } from "@/lib/campus";

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

  return (
    <div data-campus={campus} className="void-field min-h-screen">
      <TopBar campus={campus} />
      <main className="mx-auto max-w-3xl px-5 pb-32 pt-10">
        <p className="label">Profile</p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight">you · {c.short}</h1>

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
          <p className="label">Open positions</p>
          <div className="mt-4 space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <span>FSU beats UF Saturday</span>
              <span className="label text-campus-secondary/80">Yes · 100</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Goose incident before Friday</span>
              <span className="label text-campus-secondary/80">Yes · 50</span>
            </div>
          </div>
        </section>

        <Link to="/campus" className="ghost-btn mt-6 inline-block px-6 py-3 text-foreground">
          Switch campus →
        </Link>
      </main>
      <BottomNav />
    </div>
  );
}
