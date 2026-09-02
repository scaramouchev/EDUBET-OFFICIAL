import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { verifySignupCode, resendVerification, recordSignIn } from "@/lib/auth.functions";
import { deviceFingerprint, deviceInfo } from "@/lib/session";

export const Route = createFileRoute("/auth/verify")({
  validateSearch: z.object({ email: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Verify your college email — EduBet" },
      {
        name: "description",
        content: "Enter the single-use verification code sent to your official college email to activate your EduBet account.",
      },
      { property: "og:title", content: "Verify your college email — EduBet" },
      { property: "og:description", content: "Single-use, time-limited verification codes." },
    ],
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const navigate = useNavigate();
  const { email: initialEmail } = Route.useSearch();
  const [email, setEmail] = useState(initialEmail ?? "");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = useServerFn(verifySignupCode);
  const resend = useServerFn(resendVerification);
  const logSignIn = useServerFn(recordSignIn);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await verify({ data: { email, code } });
      await supabase.auth.setSession({
        access_token: res.access_token,
        refresh_token: res.refresh_token,
      });
      await logSignIn({ data: { fingerprint: deviceFingerprint(), ...deviceInfo() } }).catch(() => {});
      toast.success("Email verified — campus access unlocked");
      navigate({ to: "/home" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code could not be verified.");
    } finally {
      setBusy(false);
    }
  };

  const onResend = async () => {
    setResending(true);
    setError(null);
    try {
      await resend({ data: { email } });
      toast.success("New code sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend the code.");
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="void-field grain flex min-h-screen items-center justify-center px-5 py-16">
      <div className="w-full max-w-md">
        <p className="label text-center">Step 2 of 2</p>
        <h1 className="mt-4 text-center text-3xl font-medium tracking-tight">Enter your code</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          We sent a 6-digit single-use code to your college email. It expires shortly and can only be used once.
        </p>

        <form onSubmit={submit} className="panel mt-8 space-y-4 p-6">
          <div>
            <label className="label" htmlFor="v-email">
              College email
            </label>
            <input
              id="v-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@fsu.edu"
              className="mt-2 w-full rounded-xl border border-hairline bg-white/3 px-3 py-3 text-sm outline-none placeholder:text-muted-foreground/60"
            />
          </div>

          <div>
            <label className="label" htmlFor="v-code">
              Verification code
            </label>
            <input
              id="v-code"
              inputMode="numeric"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="mt-2 w-full rounded-xl border border-hairline bg-white/3 px-3 py-3 text-center font-mono text-2xl tracking-[0.5em] outline-none placeholder:text-muted-foreground/40"
            />
          </div>

          {error && (
            <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs text-destructive-foreground">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || code.length !== 6}
            className="ghost-btn flex w-full items-center justify-center gap-2 py-3.5 text-foreground disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Verify and activate
          </button>

          <button
            type="button"
            onClick={onResend}
            disabled={resending || !email}
            className="label w-full pt-2 text-center hover:text-foreground disabled:opacity-50"
          >
            {resending ? "Sending…" : "Resend code"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/auth" className="hover:text-foreground">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
