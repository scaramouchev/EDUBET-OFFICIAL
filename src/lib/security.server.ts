// Server-only security helpers: college resolution, throttling, audit logging.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type RequestMeta = {
  ip: string | null;
  userAgent: string | null;
};

export function createPublicAuthClient() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export async function logEvent(input: {
  userId?: string | null;
  email?: string | null;
  eventType: string;
  success?: boolean;
  severity?: "info" | "warning" | "critical";
  meta?: RequestMeta;
  metadata?: Record<string, unknown>;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("auth_audit_log").insert({
    user_id: input.userId ?? null,
    email: input.email ? input.email.toLowerCase() : null,
    event_type: input.eventType,
    success: input.success ?? true,
    severity: input.severity ?? "info",
    ip_address: input.meta?.ip ?? null,
    user_agent: input.meta?.userAgent ?? null,
    metadata: (input.metadata ?? {}) as never,
  });
}

export async function resolveCollege(email: string) {
  const domain = email.toLowerCase().split("@")[1] ?? "";
  if (!domain) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("colleges")
    .select("id, name, short_name, domain, campus, is_active")
    .eq("is_active", true);
  return (
    data?.find((c) => domain === c.domain || domain.endsWith(`.${c.domain}`)) ?? null
  );
}

const SEND_COOLDOWN_MS = 45_000;
const SEND_WINDOW_MS = 60 * 60_000;
const MAX_SENDS_PER_WINDOW = 5;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MS = 15 * 60_000;

type Purpose = "signup" | "recovery" | "login";

async function getRow(email: string, purpose: Purpose) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const key = email.toLowerCase();
  const { data } = await supabaseAdmin
    .from("verification_throttle")
    .select("*")
    .eq("email", key)
    .eq("purpose", purpose)
    .maybeSingle();
  return { supabaseAdmin, key, row: data };
}

export async function assertCanSend(email: string, purpose: Purpose) {
  const { supabaseAdmin, key, row } = await getRow(email, purpose);
  const now = Date.now();

  if (row?.locked_until && new Date(row.locked_until).getTime() > now) {
    const mins = Math.ceil((new Date(row.locked_until).getTime() - now) / 60_000);
    throw new Error(`Too many attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`);
  }

  const windowStart = row ? new Date(row.window_started_at).getTime() : now;
  const freshWindow = !row || now - windowStart > SEND_WINDOW_MS;

  if (!freshWindow && row) {
    if (row.last_sent_at && now - new Date(row.last_sent_at).getTime() < SEND_COOLDOWN_MS) {
      const secs = Math.ceil(
        (SEND_COOLDOWN_MS - (now - new Date(row.last_sent_at).getTime())) / 1000,
      );
      throw new Error(`Please wait ${secs}s before requesting another code.`);
    }
    if (row.send_count >= MAX_SENDS_PER_WINDOW) {
      throw new Error("Code request limit reached. Try again in an hour.");
    }
  }

  await supabaseAdmin.from("verification_throttle").upsert(
    {
      email: key,
      purpose,
      send_count: freshWindow ? 1 : (row?.send_count ?? 0) + 1,
      failed_attempts: freshWindow ? 0 : (row?.failed_attempts ?? 0),
      window_started_at: freshWindow ? new Date().toISOString() : row!.window_started_at,
      last_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      locked_until: null,
    },
    { onConflict: "email,purpose" },
  );
}

export async function assertNotLocked(email: string, purpose: Purpose) {
  const { row } = await getRow(email, purpose);
  if (row?.locked_until && new Date(row.locked_until).getTime() > Date.now()) {
    const mins = Math.ceil((new Date(row.locked_until).getTime() - Date.now()) / 60_000);
    throw new Error(`Account temporarily locked. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`);
  }
}

/** Returns true when the failure caused a lock. */
export async function recordFailure(email: string, purpose: Purpose) {
  const { supabaseAdmin, key, row } = await getRow(email, purpose);
  const failed = (row?.failed_attempts ?? 0) + 1;
  const locked = failed >= MAX_FAILED_ATTEMPTS;
  await supabaseAdmin.from("verification_throttle").upsert(
    {
      email: key,
      purpose,
      send_count: row?.send_count ?? 0,
      failed_attempts: locked ? 0 : failed,
      window_started_at: row?.window_started_at ?? new Date().toISOString(),
      last_sent_at: row?.last_sent_at ?? null,
      locked_until: locked ? new Date(Date.now() + LOCK_MS).toISOString() : (row?.locked_until ?? null),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "email,purpose" },
  );
  return locked;
}

export async function clearThrottle(email: string, purpose: Purpose) {
  const { supabaseAdmin, key } = await getRow(email, purpose);
  await supabaseAdmin
    .from("verification_throttle")
    .update({ failed_attempts: 0, send_count: 0, locked_until: null, updated_at: new Date().toISOString() })
    .eq("email", key)
    .eq("purpose", purpose);
}
