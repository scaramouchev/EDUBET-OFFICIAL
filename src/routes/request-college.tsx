import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { submitAccessRequest, lookupAccessRequest } from "@/lib/auth.functions";

export const Route = createFileRoute("/request-college")({
  head: () => ({
    meta: [
      { title: "Request your college — EduBet" },
      {
        name: "description",
        content:
          "Not at FSU, FAMU or UF yet? Submit your school, official college email and reason to bring EduBet to your campus, then track your ticket status.",
      },
      { property: "og:title", content: "Request your college — EduBet" },
      { property: "og:description", content: "Submit a campus expansion request and track its status." },
    ],
  }),
  component: RequestCollege,
});

type Ticket = { ticket_code: string; status: string; created_at: string; admin_note?: string | null; college_name?: string };

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  under_review: "Under Review",
  approved: "Approved",
  denied: "Denied",
};

function RequestCollege() {
  const [collegeName, setCollegeName] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);

  const [lookupTicket, setLookupTicket] = useState("");
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupResult, setLookupResult] = useState<Ticket | null | "none">(null);

  const submitFn = useServerFn(submitAccessRequest);
  const lookupFn = useServerFn(lookupAccessRequest);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const row = await submitFn({ data: { collegeName, email, reason } });
      setTicket(row as Ticket);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your request.");
    } finally {
      setBusy(false);
    }
  };

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupBusy(true);
    try {
      const row = await lookupFn({ data: { ticket: lookupTicket, email: lookupEmail } });
      setLookupResult((row as Ticket | null) ?? "none");
    } finally {
      setLookupBusy(false);
    }
  };

  return (
    <main className="void-field grain min-h-screen px-5 py-16">
      <div className="mx-auto max-w-2xl">
        <p className="label">Campus expansion</p>
        <h1 className="mt-3 text-3xl font-medium tracking-tight">Request your college</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          EduBet is live at Florida State, Florida A&amp;M and the University of Florida. Personal domains like Gmail
          don't get campus access — tell us about your school and we'll open it as demand builds.
        </p>

        {ticket ? (
          <section className="panel mt-8 p-6">
            <p className="label">Ticket submitted</p>
            <p className="mt-3 font-mono text-2xl tracking-widest text-campus-secondary">{ticket.ticket_code}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Status: <span className="text-foreground">{STATUS_LABEL[ticket.status] ?? ticket.status}</span>. Save this
              code — you can check progress any time below.
            </p>
          </section>
        ) : (
          <form onSubmit={submit} className="panel mt-8 space-y-4 p-6">
            <div>
              <label className="label" htmlFor="c-name">
                College name
              </label>
              <input
                id="c-name"
                required
                value={collegeName}
                onChange={(e) => setCollegeName(e.target.value)}
                placeholder="University of Central Florida"
                className="mt-2 w-full rounded-xl border border-hairline bg-white/3 px-3 py-3 text-sm outline-none placeholder:text-muted-foreground/60"
              />
            </div>
            <div>
              <label className="label" htmlFor="c-email">
                Official college email
              </label>
              <input
                id="c-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@ucf.edu"
                className="mt-2 w-full rounded-xl border border-hairline bg-white/3 px-3 py-3 text-sm outline-none placeholder:text-muted-foreground/60"
              />
            </div>
            <div>
              <label className="label" htmlFor="c-reason">
                Why should we launch there?
              </label>
              <textarea
                id="c-reason"
                required
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Rivalries, student orgs, campus events — what would people predict on?"
                className="mt-2 w-full resize-none rounded-xl border border-hairline bg-white/3 px-3 py-3 text-sm outline-none placeholder:text-muted-foreground/60"
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
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Submit request
            </button>
          </form>
        )}

        <section className="panel mt-6 p-6">
          <p className="label">Check ticket status</p>
          <form onSubmit={lookup} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <input
              value={lookupTicket}
              onChange={(e) => setLookupTicket(e.target.value)}
              placeholder="REQ-XXXXXXXX"
              required
              className="rounded-xl border border-hairline bg-white/3 px-3 py-3 font-mono text-sm outline-none placeholder:text-muted-foreground/60"
            />
            <input
              type="email"
              value={lookupEmail}
              onChange={(e) => setLookupEmail(e.target.value)}
              placeholder="you@ucf.edu"
              required
              className="rounded-xl border border-hairline bg-white/3 px-3 py-3 text-sm outline-none placeholder:text-muted-foreground/60"
            />
            <button disabled={lookupBusy} className="ghost-btn px-5 py-3 text-foreground disabled:opacity-50">
              Check
            </button>
          </form>
          {lookupResult === "none" && (
            <p className="mt-4 text-sm text-muted-foreground">No ticket matches that code and email.</p>
          )}
          {lookupResult && lookupResult !== "none" && (
            <div className="mt-4 text-sm">
              <p className="text-foreground">{lookupResult.college_name}</p>
              <p className="label mt-1 text-campus-secondary">
                {STATUS_LABEL[lookupResult.status] ?? lookupResult.status}
              </p>
              {lookupResult.admin_note && (
                <p className="mt-2 text-muted-foreground">{lookupResult.admin_note}</p>
              )}
            </div>
          )}
        </section>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          <Link to="/auth" className="hover:text-foreground">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
