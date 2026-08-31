import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address.").max(255);
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be 72 characters or fewer.")
  .regex(/[A-Za-z]/, "Password must contain a letter.")
  .regex(/[0-9]/, "Password must contain a number.");

function meta() {
  const request = getRequest();
  const h = request?.headers;
  return {
    ip:
      h?.get("cf-connecting-ip") ??
      h?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      null,
    userAgent: h?.get("user-agent") ?? null,
  };
}

function origin() {
  const request = getRequest();
  const o = request?.headers.get("origin");
  if (o) return o;
  try {
    return new URL(request!.url).origin;
  } catch {
    return "";
  }
}

/* ------------------------------------------------------------------ */
/* College domain check                                                */
/* ------------------------------------------------------------------ */

export const checkCollegeEmail = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string }) => ({ email: emailSchema.parse(d.email) }))
  .handler(async ({ data }) => {
    const { resolveCollege } = await import("./security.server");
    const college = await resolveCollege(data.email);
    return college
      ? { supported: true as const, college: { name: college.name, short: college.short_name, campus: college.campus } }
      : { supported: false as const, college: null };
  });

export const listColleges = createServerFn({ method: "GET" }).handler(async () => {
  const { createPublicAuthClient } = await import("./security.server");
  const { data } = await createPublicAuthClient()
    .from("colleges")
    .select("name, short_name, domain, campus")
    .eq("is_active", true)
    .order("name");
  return data ?? [];
});

/* ------------------------------------------------------------------ */
/* Sign up + verification                                              */
/* ------------------------------------------------------------------ */

export const signUpStudent = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; password: string }) => ({
    email: emailSchema.parse(d.email),
    password: passwordSchema.parse(d.password),
  }))
  .handler(async ({ data }) => {
    const sec = await import("./security.server");
    const m = meta();
    const college = await sec.resolveCollege(data.email);

    if (!college) {
      await sec.logEvent({
        email: data.email,
        eventType: "signup_blocked_unsupported_domain",
        success: false,
        severity: "warning",
        meta: m,
      });
      return { ok: false as const, reason: "unsupported_domain" as const };
    }

    await sec.assertCanSend(data.email, "signup");

    const client = sec.createPublicAuthClient();
    const { error } = await client.auth.signUp({
      email: data.email,
      password: data.password,
      options: { emailRedirectTo: `${origin()}/auth/verify` },
    });

    if (error) {
      await sec.logEvent({
        email: data.email,
        eventType: "signup_failed",
        success: false,
        severity: "warning",
        meta: m,
        metadata: { message: error.message },
      });
      throw new Error(error.message);
    }

    await sec.logEvent({ email: data.email, eventType: "account_created", meta: m, metadata: { college: college.short_name } });
    await sec.logEvent({ email: data.email, eventType: "verification_code_sent", meta: m });

    return { ok: true as const, reason: null, college: { name: college.name, short: college.short_name } };
  });

export const resendVerification = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string }) => ({ email: emailSchema.parse(d.email) }))
  .handler(async ({ data }) => {
    const sec = await import("./security.server");
    const m = meta();
    await sec.assertCanSend(data.email, "signup");
    const client = sec.createPublicAuthClient();
    const { error } = await client.auth.resend({
      type: "signup",
      email: data.email,
      options: { emailRedirectTo: `${origin()}/auth/verify` },
    });
    if (error) {
      await sec.logEvent({
        email: data.email,
        eventType: "verification_code_resend_failed",
        success: false,
        severity: "warning",
        meta: m,
        metadata: { message: error.message },
      });
      throw new Error(error.message);
    }
    await sec.logEvent({ email: data.email, eventType: "verification_code_resent", meta: m });
    return { ok: true as const };
  });

export const verifySignupCode = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; code: string }) => ({
    email: emailSchema.parse(d.email),
    code: z.string().trim().regex(/^[0-9]{6}$/, "Enter the 6-digit code.").parse(d.code),
  }))
  .handler(async ({ data }) => {
    const sec = await import("./security.server");
    const m = meta();
    await sec.assertNotLocked(data.email, "signup");

    const client = sec.createPublicAuthClient();
    const { data: result, error } = await client.auth.verifyOtp({
      email: data.email,
      token: data.code,
      type: "email",
    });

    if (error || !result.session) {
      const locked = await sec.recordFailure(data.email, "signup");
      await sec.logEvent({
        email: data.email,
        eventType: "verification_failed",
        success: false,
        severity: locked ? "critical" : "warning",
        meta: m,
        metadata: { message: error?.message ?? "invalid_or_expired", locked },
      });
      const msg = /expired/i.test(error?.message ?? "")
        ? "That code has expired. Request a new one."
        : "That code is invalid or has already been used.";
      throw new Error(locked ? "Too many incorrect codes. Account locked for 15 minutes." : msg);
    }

    const userId = result.session.user.id;
    const college = await sec.resolveCollege(data.email);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("profiles")
      .update({
        campus_verified: Boolean(college),
        campus: college?.campus ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    await sec.clearThrottle(data.email, "signup");
    await sec.logEvent({ userId, email: data.email, eventType: "email_verified", meta: m });

    return {
      ok: true as const,
      access_token: result.session.access_token,
      refresh_token: result.session.refresh_token,
    };
  });

/* ------------------------------------------------------------------ */
/* Sign-in logging + sessions                                          */
/* ------------------------------------------------------------------ */

export const reportSignInFailure = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; message: string }) => ({
    email: emailSchema.parse(d.email),
    message: z.string().max(300).parse(d.message),
  }))
  .handler(async ({ data }) => {
    const sec = await import("./security.server");
    const locked = await sec.recordFailure(data.email, "login");
    await sec.logEvent({
      email: data.email,
      eventType: "login_failed",
      success: false,
      severity: locked ? "critical" : "warning",
      meta: meta(),
      metadata: { message: data.message, locked },
    });
    return { locked };
  });

export const recordSignIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { fingerprint: string; device?: string; browser?: string; platform?: string }) => ({
    fingerprint: z.string().min(6).max(80).parse(d.fingerprint),
    device: z.string().max(80).optional().parse(d.device),
    browser: z.string().max(80).optional().parse(d.browser),
    platform: z.string().max(80).optional().parse(d.platform),
  }))
  .handler(async ({ data, context }) => {
    const sec = await import("./security.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const m = meta();
    const email = (context.claims["email"] as string | undefined) ?? null;

    await supabaseAdmin.from("user_sessions").upsert(
      {
        user_id: context.userId,
        session_fingerprint: data.fingerprint,
        device: data.device ?? null,
        browser: data.browser ?? null,
        platform: data.platform ?? null,
        ip_address: m.ip,
        user_agent: m.userAgent,
        last_seen_at: new Date().toISOString(),
        ended_at: null,
      },
      { onConflict: "user_id,session_fingerprint" },
    );

    await supabaseAdmin
      .from("profiles")
      .update({ last_login_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", context.userId);

    if (email) await sec.clearThrottle(email, "login");
    await sec.logEvent({ userId: context.userId, email, eventType: "login_success", meta: m });
    return { ok: true as const };
  });

export const recordSignOut = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { fingerprint: string }) => ({ fingerprint: z.string().min(6).max(80).parse(d.fingerprint) }))
  .handler(async ({ data, context }) => {
    const sec = await import("./security.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("user_sessions")
      .update({ ended_at: new Date().toISOString(), last_seen_at: new Date().toISOString() })
      .eq("user_id", context.userId)
      .eq("session_fingerprint", data.fingerprint);
    await sec.logEvent({
      userId: context.userId,
      email: (context.claims["email"] as string | undefined) ?? null,
      eventType: "logout",
      meta: meta(),
    });
    return { ok: true as const };
  });

/* ------------------------------------------------------------------ */
/* Password recovery                                                   */
/* ------------------------------------------------------------------ */

export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string }) => ({ email: emailSchema.parse(d.email) }))
  .handler(async ({ data }) => {
    const sec = await import("./security.server");
    const m = meta();
    await sec.assertCanSend(data.email, "recovery");
    const client = sec.createPublicAuthClient();
    await client.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${origin()}/reset-password`,
    });
    await sec.logEvent({ email: data.email, eventType: "password_reset_requested", meta: m });
    // Always generic: never reveal whether the account exists.
    return { ok: true as const };
  });

export const recordPasswordChanged = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sec = await import("./security.server");
    await sec.logEvent({
      userId: context.userId,
      email: (context.claims["email"] as string | undefined) ?? null,
      eventType: "password_changed",
      severity: "warning",
      meta: meta(),
    });
    return { ok: true as const };
  });

/* ------------------------------------------------------------------ */
/* Access requests (unsupported colleges)                              */
/* ------------------------------------------------------------------ */

export const submitAccessRequest = createServerFn({ method: "POST" })
  .inputValidator((d: { collegeName: string; email: string; reason: string }) => ({
    collegeName: z.string().trim().min(2, "Enter your college name.").max(120).parse(d.collegeName),
    email: emailSchema.parse(d.email),
    reason: z.string().trim().min(10, "Tell us a bit more (10+ characters).").max(1000).parse(d.reason),
  }))
  .handler(async ({ data }) => {
    const sec = await import("./security.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count } = await supabaseAdmin
      .from("access_requests")
      .select("id", { count: "exact", head: true })
      .eq("email", data.email)
      .gte("created_at", new Date(Date.now() - 24 * 3600_000).toISOString());
    if ((count ?? 0) >= 3) {
      throw new Error("You've reached the daily limit for access requests.");
    }

    const { data: row, error } = await supabaseAdmin
      .from("access_requests")
      .insert({ college_name: data.collegeName, email: data.email, reason: data.reason })
      .select("ticket_code, status, created_at")
      .single();
    if (error) throw new Error(error.message);

    await sec.logEvent({
      email: data.email,
      eventType: "access_request_submitted",
      meta: meta(),
      metadata: { college: data.collegeName, ticket: row.ticket_code },
    });
    return row;
  });

export const lookupAccessRequest = createServerFn({ method: "POST" })
  .inputValidator((d: { ticket: string; email: string }) => ({
    ticket: z.string().trim().min(4).max(40).parse(d.ticket),
    email: emailSchema.parse(d.email),
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("access_requests")
      .select("ticket_code, college_name, status, admin_note, created_at, updated_at")
      .eq("ticket_code", data.ticket.toUpperCase())
      .eq("email", data.email)
      .maybeSingle();
    return row ?? null;
  });
