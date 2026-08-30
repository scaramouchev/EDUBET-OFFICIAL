import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EduBet — Predict what happens next on campus" },
      {
        name: "description",
        content:
          "A campus prediction network. Follow what your university is talking about, make predictions in seconds, and climb your campus leaderboard.",
      },
      { property: "og:title", content: "EduBet — Predict what happens next on campus" },
      {
        property: "og:description",
        content: "Your campus. Your predictions. Your rank.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <main className="void-field grain relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-hairline bg-white/4 backdrop-blur-xl">
        <svg viewBox="0 0 40 40" className="h-9 w-9 opacity-80">
          <circle cx="20" cy="20" r="13" fill="none" stroke="currentColor" strokeWidth="1" />
          <path d="M7 20h26" stroke="currentColor" strokeWidth="1" />
          <path d="M13 16l-4 4 4 4M27 16l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>

      <p className="label mt-12">EduBet</p>

      <h1 className="mt-4 max-w-2xl text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
        Predict what happens next.
      </h1>

      <div className="mt-6 space-y-1 text-muted-foreground">
        <p>Your campus.</p>
        <p>Your predictions.</p>
        <p>Your rank.</p>
      </div>

      <Link to="/campus" className="ghost-btn mt-12 px-8 py-4 text-foreground">
        Enter →
      </Link>

      <p className="label absolute bottom-10">Campus Prediction Network · 2026</p>
    </main>
  );
}
