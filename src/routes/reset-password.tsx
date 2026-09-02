import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { recordPasswordChanged } from "@/lib/auth.functions";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Choose a new password — EduBet" },
      {
        name: "description",
        content: "Complete your EduBet account recovery by setting a new password from your single-use reset link.",
      },
      { property: "og:title", content: "Choose a new password — EduBet" },
      { property: "og:description", content: "Finish recovery and secure your verified student account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logChange = useServerFn(recordPasswordChanged);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setReady(Boolean(s)));
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Use at least 8 characters with a letter and a number.");
      return;
    }
    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw new Error(updateError.message);
      await logChange({ data: undefined }).catch(() => {});
      toast.success("Password updated");
      navigate({ to: "/home" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update your password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="void-field grain flex min-h-screen items-center justify-center px-5 py-16">
      <div className="w-full max-w-md">
        <p className="label text-center">Account recovery</p>
        <h1 className="mt-4 text-center text-3xl font-medium tracking-tight">New password</h1>

        {!ready ? (
          <div className="panel mt-8 p-6 text-sm text-muted-foreground">
            This reset link is invalid, expired, or already used. Request a fresh one from{" "}
            <Link to="/auth/forgot" className="text-foreground underline">
              account recovery
            </Link>
            .
          </div>
        ) : (
          <form onSubmit={submit} className="panel mt-8 space-y-4 p-6">
            <div>
              <label className="label" htmlFor="p1">
                New password
              </label>
              <input
                id="p1"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-xl border border-hairline bg-white/3 px-3 py-3 text-sm outline-none"
              />
            </div>
            <div>
              <label className="label" htmlFor="p2">
                Confirm password
              </label>
              <input
                id="p2"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-2 w-full rounded-xl border border-hairline bg-white/3 px-3 py-3 text-sm outline-none"
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
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Update password
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
