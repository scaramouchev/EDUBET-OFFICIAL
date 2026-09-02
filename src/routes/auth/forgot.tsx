import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { requestPasswordReset } from "@/lib/auth.functions";

export const Route = createFileRoute("/auth/forgot")({
  head: () => ({
    meta: [
      { title: "Reset your password — EduBet" },
      {
        name: "description",
        content: "Request a time-limited, single-use password reset link sent to your verified college email.",
      },
      { property: "og:title", content: "Reset your password — EduBet" },
      { property: "og:description", content: "Single-use, time-limited reset links for verified students." },
    ],
  }),
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useServerFn(requestPasswordReset);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await request({ data: { email } });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the reset link.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="void-field grain flex min-h-screen items-center justify-center px-5 py-16">
      <div className="w-full max-w-md">
        <p className="label text-center">Account recovery</p>
        <h1 className="mt-4 text-center text-3xl font-medium tracking-tight">Forgot password</h1>

        {sent ? (
          <div className="panel mt-8 p-6 text-sm text-muted-foreground">
            If an account exists for <span className="text-foreground">{email}</span>, a single-use reset link is on its
            way. It expires shortly and can only be used once.
          </div>
        ) : (
          <form onSubmit={submit} className="panel mt-8 space-y-4 p-6">
            <div>
              <label className="label" htmlFor="f-email">
                College email
              </label>
              <input
                id="f-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@fsu.edu"
                className="mt-2 w-full rounded-xl border border-hairline bg-white/3 px-3 py-3 text-sm outline-none placeholder:text-muted-foreground/60"
              />
            </div>
            {error && (
              <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs text-destructive-foreground">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="ghost-btn flex w-full items-center justify-center gap-2 py-3.5 text-foreground disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Send reset link
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/auth" className="hover:text-foreground">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
