import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CAMPUSES, storeCampus } from "@/lib/campus";

export const Route = createFileRoute("/campus")({
  head: () => ({
    meta: [
      { title: "Select your campus — EduBet" },
      {
        name: "description",
        content: "Pick your university and the whole interface takes on your campus atmosphere.",
      },
      { property: "og:title", content: "Select your campus — EduBet" },
      { property: "og:description", content: "Your campus owns the atmosphere." },
    ],
  }),
  component: CampusSelect,
});

function CampusSelect() {
  const navigate = useNavigate();

  return (
    <main className="void-field grain min-h-screen overflow-hidden px-6 pt-24">
      <div className="mx-auto max-w-4xl">
        <p className="label">Select campus</p>
        <h1 className="mt-3 text-5xl font-semibold tracking-tight">Where are you?</h1>
        <p className="mt-3 text-muted-foreground">Your campus owns the atmosphere.</p>

        <div className="mt-14 grid gap-5 sm:grid-cols-3">
          {CAMPUSES.map((c) => (
            <button
              key={c.id}
              data-campus={c.id}
              onClick={() => {
                storeCampus(c.id);
                navigate({ to: "/home" });
              }}
              className="panel group relative overflow-hidden p-5 text-left transition-transform duration-300 hover:-translate-y-1"
            >
              <div className="flex gap-1.5">
                {c.colors.map((col) => (
                  <span key={col} className="h-3 w-3 rounded-[3px]" style={{ background: col }} />
                ))}
              </div>
              <h2 className="mt-6 text-2xl font-medium tracking-tight">{c.short}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{c.name}</p>
              <p className="label mt-8 transition-colors group-hover:text-foreground">Enter →</p>
            </button>
          ))}
        </div>

        <div className="mt-10 text-center">
          <span className="label">Launch your campus →</span>
        </div>
      </div>
    </main>
  );
}
