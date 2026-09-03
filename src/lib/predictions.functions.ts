import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const campusEnum = z.enum(["fsu", "uf", "famu"]);

/**
 * Locks a prediction permanently. Database triggers block every later
 * UPDATE/DELETE, so the selection, amount and timestamp are immutable.
 */
export const lockPrediction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { marketId: string; question: string; side: "YES" | "NO"; amount: number; campus?: string }) => ({
      marketId: z.string().trim().min(1).max(64).parse(d.marketId),
      question: z.string().trim().min(3).max(300).parse(d.question),
      side: z.enum(["YES", "NO"]).parse(d.side),
      amount: z.number().int().min(10).max(1000).parse(d.amount),
      campus: d.campus ? campusEnum.parse(d.campus) : null,
    }),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: existing } = await supabase
      .from("predictions")
      .select("reference_id")
      .eq("user_id", userId)
      .eq("market_id", data.marketId)
      .maybeSingle();
    if (existing) {
      throw new Error("You already locked a prediction on this market. Locks are permanent.");
    }

    const { data: row, error } = await supabase
      .from("predictions")
      .insert({
        user_id: userId,
        market_id: data.marketId,
        market_question: data.question,
        side: data.side,
        amount: data.amount,
        campus: data.campus,
      })
      .select("reference_id, side, amount, locked_at, market_id")
      .single();
    if (error) throw new Error(error.message);

    const { logEvent } = await import("./security.server");
    await logEvent({
      userId,
      email: (context.claims["email"] as string | undefined) ?? null,
      eventType: "prediction_locked",
      metadata: {
        market_id: data.marketId,
        side: data.side,
        amount: data.amount,
        reference: row.reference_id,
      },
    });

    return row;
  });

export const listMyPredictions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("predictions")
      .select("reference_id, market_id, market_question, side, amount, locked_at, outcome, resolved_at")
      .eq("user_id", context.userId)
      .order("locked_at", { ascending: false });
    return data ?? [];
  });

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("id, email, username, bio, avatar_url, campus, campus_verified, show_campus, is_public, account_status, created_at, last_login_at")
      .eq("id", context.userId)
      .maybeSingle();
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    return { profile, roles: (roles ?? []).map((r) => r.role) };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { username?: string; bio?: string; showCampus?: boolean; isPublic?: boolean }) => ({
    username: d.username
      ? z
          .string()
          .trim()
          .regex(/^[a-zA-Z0-9_]{3,20}$/, "3–20 characters: letters, numbers or underscore.")
          .parse(d.username)
      : undefined,
    bio: d.bio !== undefined ? z.string().trim().max(280, "Bio must be 280 characters or fewer.").parse(d.bio) : undefined,
    showCampus: d.showCampus,
    isPublic: d.isPublic,
  }))
  .handler(async ({ data, context }) => {
    const patch: { updated_at: string; username?: string; bio?: string; show_campus?: boolean; is_public?: boolean } = { updated_at: new Date().toISOString() };
    if (data.username !== undefined) patch["username"] = data.username;
    if (data.bio !== undefined) patch["bio"] = data.bio;
    if (data.showCampus !== undefined) patch["show_campus"] = data.showCampus;
    if (data.isPublic !== undefined) patch["is_public"] = data.isPublic;

    const { error } = await context.supabase.from("profiles").update(patch).eq("id", context.userId);
    if (error) {
      throw new Error(/duplicate key/i.test(error.message) ? "That username is taken." : error.message);
    }

    const { logEvent } = await import("./security.server");
    await logEvent({
      userId: context.userId,
      email: (context.claims["email"] as string | undefined) ?? null,
      eventType: "profile_updated",
      metadata: { fields: Object.keys(patch).filter((k) => k !== "updated_at") },
    });
    return { ok: true as const };
  });

/** Personal security view: recent audit events + active sessions. */
export const getMySecurity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: events }, { data: sessions }] = await Promise.all([
      context.supabase
        .from("auth_audit_log")
        .select("event_type, severity, success, ip_address, created_at, metadata")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(50),
      context.supabase
        .from("user_sessions")
        .select("device, browser, platform, ip_address, started_at, last_seen_at, ended_at")
        .eq("user_id", context.userId)
        .order("last_seen_at", { ascending: false })
        .limit(20),
    ]);
    return { events: events ?? [], sessions: sessions ?? [] };
  });
