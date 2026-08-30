import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BottomNav, TopBar } from "@/components/Chrome";
import { getStoredCampus, type CampusId } from "@/lib/campus";

export const Route = createFileRoute("/create")({
  head: () => ({
    meta: [
      { title: "Create a market — EduBet" },
      {
        name: "description",
        content: "Ask your campus a question. Set a close time and let students predict the outcome.",
      },
      { property: "og:title", content: "Create a market — EduBet" },
      { property: "og:description", content: "Ask your campus a question." },
    ],
  }),
  component: Create,
});

const CATEGORIES = ["Sports", "Campus", "Campus Chaos", "Politics"];

function Create() {
  const [campus, setCampus] = useState<CampusId>("fsu");
  const [cat, setCat] = useState("Campus Chaos");
  const [q, setQ] = useState("");
  useEffect(() => setCampus(getStoredCampus()), []);

  return (
    <div data-campus={campus} className="void-field min-h-screen">
      <TopBar campus={campus} />
      <main className="mx-auto max-w-3xl px-5 pb-32 pt-10">
        <p className="label">New market</p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight">Ask your campus.</h1>

        <section className="panel mt-6 p-6">
          <p className="label">Question</p>
          <textarea
            value={q}
            onChange={(e) => setQ(e.target.value)}
            rows={3}
            placeholder="Will the fountain be dyed garnet before game day?"
            className="mt-3 w-full resize-none rounded-lg border border-hairline bg-white/3 p-4 text-base outline-none placeholder:text-muted-foreground focus:border-campus-secondary/50"
          />

          <p className="label mt-6">Category</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`ghost-btn px-4 py-2.5 ${
                  cat === c ? "border-campus-secondary/60 bg-white/6 text-foreground" : "text-muted-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <button
            disabled={!q.trim()}
            className="ghost-btn mt-8 w-full py-4 text-foreground disabled:opacity-40"
          >
            Launch market →
          </button>
        </section>
      </main>
      <BottomNav />
    </div>
  );
}
