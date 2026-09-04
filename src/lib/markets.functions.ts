import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const campusEnum = z.enum(["fsu", "uf", "famu"]);

export type MarketRow = {
  id: string;
  campus: "fsu" | "uf" | "famu" | null;
  category: string;
  question: string;
  detail: string | null;
  yes_odds: number;
  no_odds: number;
  closes_at: string;
  status: string;
  outcome: string | null;
  sweepstakes_entries_reward: number;
};

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

/* ------------------------------- public reads ------------------------------ */

export const listMarkets = createServerFn({ method: "GET" })
  .inputValidator((d: { campus?: string } | undefined) => ({
    campus: d?.campus ? campusEnum.parse(d.campus) : undefined,
  }))
  .handler(async ({ data }) => {
    let q = publicClient()
      .from("markets")
      .select(
        "id, campus, category, question, detail, yes_odds, no_odds, closes_at, status, outcome, sweepstakes_entries_reward",
      )
      .neq("status", "draft")
      .order("closes_at", { ascending: true })
      .limit(50);
    if (data.campus) q = q.or(`campus.eq.${data.campus},campus.is.null`);
    const { data: rows } = await q;
    return (rows ?? []) as MarketRow[];
  });

export const listCampusEvents = createServerFn({ method: "GET" })
  .inputValidator((d: { campus?: string } | undefined) => ({
    campus: d?.campus ? campusEnum.parse(d.campus) : undefined,
  }))
  .handler(async ({ data }) => {
    let q = publicClient()
      .from("campus_events")
      .select("id, campus, title, description, category, location, starts_at, source, url")
      .eq("is_active", true)
      .order("starts_at", { ascending: true })
      .limit(60);
    if (data.campus) q = q.eq("campus", data.campus);
    const { data: rows } = await q;
    return rows ?? [];
  });

export const listSweepstakes = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await publicClient()
    .from("sweepstakes")
    .select("id, campus, title, prize, description, entry_cost, draws_at, status, drawn_at")
    .order("draws_at", { ascending: true })
    .limit(30);
  return data ?? [];
});

/* ------------------------------ student actions ---------------------------- */

export const getMyWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("coin_balances")
      .select("balance, sweepstakes_entries, lifetime_won, lifetime_staked")
      .eq("user_id", context.userId)
      .maybeSingle();
    const { data: ledger } = await context.supabase
      .from("coin_ledger")
      .select("delta, entries_delta, reason, reference, balance_after, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(25);
    return {
      balance: data?.balance ?? 0,
      entries: data?.sweepstakes_entries ?? 0,
      lifetimeWon: data?.lifetime_won ?? 0,
      lifetimeStaked: data?.lifetime_staked ?? 0,
      ledger: ledger ?? [],
    };
  });

export const enterSweepstakes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sweepstakesId: string; entries: number }) => ({
    sweepstakesId: z.string().uuid().parse(d.sweepstakesId),
    entries: z.number().int().min(1).max(50).parse(d.entries),
  }))
  .handler(async ({ data, context }) => {
    const { data: remaining, error } = await context.supabase.rpc("enter_sweepstakes", {
      _sweepstakes_id: data.sweepstakesId,
      _entries: data.entries,
    });
    if (error) throw new Error(error.message);
    return { remaining: remaining as number };
  });

export const myEntries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("sweepstakes_entries")
      .select("sweepstakes_id, entries, created_at")
      .eq("user_id", context.userId);
    return data ?? [];
  });

/* -------------------------------- admin area ------------------------------- */

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Administrator access required.");
}

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) return { isAdmin: false as const };

    const [markets, events, feeds, sweeps] = await Promise.all([
      context.supabase
        .from("markets")
        .select("id, campus, category, question, yes_odds, no_odds, closes_at, status, outcome, resolved_at")
        .order("created_at", { ascending: false })
        .limit(60),
      context.supabase
        .from("campus_events")
        .select("id, campus, title, category, location, starts_at, source, is_active")
        .order("starts_at", { ascending: true })
        .limit(60),
      context.supabase
        .from("event_feeds")
        .select("id, campus, name, url, is_active, last_synced_at, last_result")
        .order("campus"),
      context.supabase
        .from("sweepstakes")
        .select("id, campus, title, prize, entry_cost, draws_at, status, winner_user_id")
        .order("draws_at", { ascending: true }),
    ]);

    return {
      isAdmin: true as const,
      markets: markets.data ?? [],
      events: events.data ?? [],
      feeds: feeds.data ?? [],
      sweepstakes: sweeps.data ?? [],
    };
  });

export const createMarket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      question: string;
      detail?: string;
      category: string;
      campus?: string;
      yesOdds: number;
      noOdds: number;
      closesAt: string;
      eventId?: string;
      reward?: number;
    }) => ({
      question: z.string().trim().min(8).max(300).parse(d.question),
      detail: d.detail ? z.string().trim().max(500).parse(d.detail) : null,
      category: z.string().trim().min(2).max(40).parse(d.category),
      campus: d.campus ? campusEnum.parse(d.campus) : null,
      yesOdds: z.number().int().refine((n) => Math.abs(n) >= 100, "Odds must be +100 or lower than -100").parse(d.yesOdds),
      noOdds: z.number().int().refine((n) => Math.abs(n) >= 100, "Odds must be +100 or lower than -100").parse(d.noOdds),
      closesAt: z.string().min(4).parse(d.closesAt),
      eventId: d.eventId ? z.string().uuid().parse(d.eventId) : null,
      reward: z.number().int().min(0).max(20).parse(d.reward ?? 1),
    }),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("markets")
      .insert({
        question: data.question,
        detail: data.detail,
        category: data.category,
        campus: data.campus,
        yes_odds: data.yesOdds,
        no_odds: data.noOdds,
        closes_at: new Date(data.closesAt).toISOString(),
        event_id: data.eventId,
        sweepstakes_entries_reward: data.reward,
        created_by: context.userId,
        status: "open",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/** Creates one market for each selected campus event, in one go. */
export const createMarketsFromEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { eventIds: string[]; yesOdds: number; noOdds: number }) => ({
    eventIds: z.array(z.string().uuid()).min(1).max(25).parse(d.eventIds),
    yesOdds: z.number().int().parse(d.yesOdds),
    noOdds: z.number().int().parse(d.noOdds),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: events } = await context.supabase
      .from("campus_events")
      .select("id, campus, title, category, starts_at")
      .in("id", data.eventIds);
    if (!events?.length) throw new Error("No matching events.");

    const rows = events.map((e) => ({
      question: `Will "${e.title}" happen as scheduled?`,
      detail: "Auto-generated from the campus events database.",
      category: e.category,
      campus: e.campus,
      yes_odds: data.yesOdds,
      no_odds: data.noOdds,
      closes_at: e.starts_at,
      event_id: e.id,
      created_by: context.userId,
      status: "open" as const,
    }));
    const { error } = await context.supabase.from("markets").insert(rows);
    if (error) throw new Error(error.message);
    return { created: rows.length };
  });

export const resolveMarket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { marketId: string; outcome: "YES" | "NO"; note?: string }) => ({
    marketId: z.string().uuid().parse(d.marketId),
    outcome: z.enum(["YES", "NO"]).parse(d.outcome),
    note: d.note ? z.string().trim().max(300).parse(d.note) : null,
  }))
  .handler(async ({ data, context }) => {
    const { data: res, error } = await context.supabase.rpc("resolve_market", {
      _market_id: data.marketId,
      _outcome: data.outcome,
      _note: data.note,
    });
    if (error) throw new Error(error.message);
    const row = Array.isArray(res) ? res[0] : res;
    return (row ?? { settled: 0, winners: 0, paid: 0 }) as {
      settled: number;
      winners: number;
      paid: number;
    };
  });

export const upsertEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      id?: string;
      campus: string;
      title: string;
      description?: string;
      category: string;
      location?: string;
      startsAt: string;
    }) => ({
      id: d.id ? z.string().uuid().parse(d.id) : null,
      campus: campusEnum.parse(d.campus),
      title: z.string().trim().min(3).max(160).parse(d.title),
      description: d.description ? z.string().trim().max(500).parse(d.description) : null,
      category: z.string().trim().min(2).max(40).parse(d.category),
      location: d.location ? z.string().trim().max(120).parse(d.location) : null,
      startsAt: z.string().min(4).parse(d.startsAt),
    }),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload = {
      campus: data.campus,
      title: data.title,
      description: data.description,
      category: data.category,
      location: data.location,
      starts_at: new Date(data.startsAt).toISOString(),
      source: "admin" as const,
    };
    const { error } = data.id
      ? await context.supabase.from("campus_events").update(payload).eq("id", data.id)
      : await context.supabase.from("campus_events").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const createSweepstakes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { title: string; prize: string; description?: string; campus?: string; entryCost: number; drawsAt: string }) => ({
    title: z.string().trim().min(3).max(120).parse(d.title),
    prize: z.string().trim().min(2).max(160).parse(d.prize),
    description: d.description ? z.string().trim().max(400).parse(d.description) : null,
    campus: d.campus ? campusEnum.parse(d.campus) : null,
    entryCost: z.number().int().min(1).max(50).parse(d.entryCost),
    drawsAt: z.string().min(4).parse(d.drawsAt),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("sweepstakes").insert({
      title: data.title,
      prize: data.prize,
      description: data.description,
      campus: data.campus,
      entry_cost: data.entryCost,
      draws_at: new Date(data.drawsAt).toISOString(),
      status: "open",
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const drawSweepstakes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sweepstakesId: string }) => ({
    sweepstakesId: z.string().uuid().parse(d.sweepstakesId),
  }))
  .handler(async ({ data, context }) => {
    const { data: winner, error } = await context.supabase.rpc("draw_sweepstakes", {
      _sweepstakes_id: data.sweepstakesId,
    });
    if (error) throw new Error(error.message);
    return { winner: winner as string };
  });

/**
 * Pulls events from the admin-configured external campus calendar feeds.
 * Feeds are best-effort: a failing feed is recorded and skipped, never fatal.
 */
export const syncEventFeeds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data: feeds } = await context.supabase
      .from("event_feeds")
      .select("id, campus, name, url")
      .eq("is_active", true);

    let imported = 0;
    const results: { name: string; result: string }[] = [];

    for (const feed of feeds ?? []) {
      let result = "ok";
      try {
        const res = await fetch(feed.url, { headers: { accept: "application/json" } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body: unknown = await res.json();
        const items = normalizeFeed(body);
        if (!items.length) throw new Error("no events found");
        for (const item of items.slice(0, 40)) {
          const { error } = await context.supabase.from("campus_events").upsert(
            {
              campus: feed.campus,
              title: item.title,
              description: item.description,
              category: item.category ?? "Campus",
              location: item.location,
              starts_at: item.startsAt,
              url: item.url,
              source: "feed" as const,
              external_id: item.externalId,
            },
            { onConflict: "campus,external_id" },
          );
          if (!error) imported += 1;
        }
        result = `${items.length} events`;
      } catch (err) {
        result = err instanceof Error ? err.message : "failed";
      }
      results.push({ name: feed.name, result });
      await context.supabase
        .from("event_feeds")
        .update({ last_synced_at: new Date().toISOString(), last_result: result })
        .eq("id", feed.id);
    }
    return { imported, results };
  });

type FeedItem = {
  title: string;
  description: string | null;
  category: string | null;
  location: string | null;
  startsAt: string;
  url: string | null;
  externalId: string;
};

/** Tolerant reader for the common JSON calendar shapes (Localist, iCal-to-JSON, plain arrays). */
function normalizeFeed(body: unknown): FeedItem[] {
  const root = body as Record<string, unknown> | unknown[];
  const raw: unknown[] = Array.isArray(root)
    ? root
    : ((root as Record<string, unknown>)["events"] as unknown[]) ??
      ((root as Record<string, unknown>)["items"] as unknown[]) ??
      [];

  return raw
    .map((entry) => {
      const e = ((entry as Record<string, unknown>)["event"] ?? entry) as Record<string, unknown>;
      const title = (e["title"] ?? e["name"] ?? e["summary"]) as string | undefined;
      const start = (e["starts_at"] ?? e["start"] ?? e["startDate"] ?? e["dtstart"]) as string | undefined;
      if (!title || !start || Number.isNaN(Date.parse(start))) return null;
      return {
        title: String(title).slice(0, 160),
        description: e["description"] ? String(e["description"]).slice(0, 500) : null,
        category: e["category"] ? String(e["category"]).slice(0, 40) : null,
        location: (e["location"] ?? e["location_name"]) ? String(e["location"] ?? e["location_name"]).slice(0, 120) : null,
        startsAt: new Date(start).toISOString(),
        url: e["url"] ? String(e["url"]) : null,
        externalId: String(e["id"] ?? e["uid"] ?? `${title}-${start}`).slice(0, 120),
      } satisfies FeedItem;
    })
    .filter((x): x is FeedItem => x !== null);
}
