import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, user: session?.user ?? null, loading };
}

/** Stable, non-identifying device fingerprint used for session records. */
export function deviceFingerprint() {
  if (typeof window === "undefined") return "server-side-render";
  const KEY = "edubet.fingerprint";
  let v = window.localStorage.getItem(KEY);
  if (!v) {
    v = crypto.randomUUID();
    window.localStorage.setItem(KEY, v);
  }
  return v;
}

export function deviceInfo() {
  if (typeof navigator === "undefined") return {};
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Safari\//.test(ua)
        ? "Safari"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : "Other";
  const device = /Mobi|Android|iPhone/.test(ua) ? "Mobile" : "Desktop";
  return { browser, device, platform: navigator.platform || "unknown" };
}
