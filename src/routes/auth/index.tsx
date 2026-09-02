import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Mail, ShieldCheck, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { checkCollegeEmail, signUpStudent, reportSignInFailure, recordSignIn } from "@/lib/auth.functions";
import { deviceFingerprint, deviceInfo } from "@/lib/session";

export const Route = createFileRoute("/auth/")({
  head: () => ({
    meta: [
      { title: "Sign in or join — EduBet" },
      {
        name: "description",
        content:
          "Create your EduBet account with your official college email. Verified students at FSU, FAMU and UF get full campus access.",
      },
      { property: "og:title", content: "Sign in or join — EduBet" },
      { property: "og:description", content: "Verified college email required. FSU, FAMU and UF supported." },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [college, setCollege] = useState<string | null>(null);

  const check = useServerFn(checkCollegeEmail);
  const signUp = useServerFn(signUpStudent);
  const reportFailure = useServerFn(reportSignInFailure);
  const logSignIn = useServerFn(recordSignIn);

  const onEmailBlur = async () => {
    setCollege(null);
    if (!email.includes("@")) return;
    try {
      const res = await check({ data: { email } });
      setCollege(res.supported ? res.college!.name : null);
      if (!res.supported && mode === "signup") {
        setError("That domain isn't supported yet. Request your college below.");
      } else {
        setError(null);
      }
    } catch {
      /* ignore inline check errors */
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "signup") {
        const res = await signUp({ data: { email, password } });
        if (!res.ok) {
          setError("Your college isn't supported yet — submit a request and we'll notify you.");
          return;
        }
        toast.success(`Verification code sent to ${email}`);
        navigate({ to: "/auth/verify", search: { email } });
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          await reportFailure({ data: { email, message: signInError.message } }).catch(() => {});
          setError(
            /confirm/i.test(signInError.message)
              ? "Email not verified yet. Check your inbox or resend a code."
              : "Invalid email or password.",
          );
          return;
        }
        await logSignIn({ data: { fingerprint: deviceFingerprint(), ...deviceInfo() } }).catch(() => {});
        toast.success("Signed in");
        navigate({ to: "/home" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="void-field grain flex min-h-screen items-center justify-center px-5 py-16">
      <div className="w-full max-w-md">
        <Link to="/" className="label block text-center">
          EduBet
        </Link>
        <h1 className="mt-4 text-center text-3xl font-medium tracking-tight">
          {mode === "signup" ? "Join your campus" : "Welcome back"}
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {mode === "signup"
            ? "Official college email required. FSU · FAMU · UF"
            : "Sign in to your verified student account."}
        </p>

        <div className="panel mt-8 p-6">
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl border border-hairline p-1">
            {(["signup", "signin"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                className={`rounded-lg py-2 text-sm transition-colors ${
                  mode === m ? "bg-white/8 text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "signup" ? "Create account" : "Sign in"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">
                College email
              </label>
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-hairline bg-white/3 px-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={onEmailBlur}
                  placeholder="you@fsu.edu"
                  className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground/60"
                />
              </div>
              {college && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-campus-secondary">
                  <ShieldCheck className="h-3.5 w-3.5" /> {college} detected
                </p>
              )}
            </div>

            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-hairline bg-white/3 px-3">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "signup" ? "8+ chars, letters and numbers" : "Your password"}
                  className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground/60"
                />
              </div>
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
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signup" ? "Send verification code" : "Sign in"}
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-2 border-t border-hairline pt-5 text-xs text-muted-foreground">
            <Link to="/auth/forgot" className="hover:text-foreground">
              Forgot your password?
            </Link>
            <Link to="/auth/verify" search={{ email }} className="hover:text-foreground">
              Have a code? Verify your email →
            </Link>
            <Link to="/request-college" className="hover:text-foreground">
              Your college isn't listed? Request access →
            </Link>
          </div>
        </div>

        <p className="label mt-8 text-center">Verification codes expire · single use · rate limited</p>
      </div>
    </main>
  );
}
