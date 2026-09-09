-- 1. Live campus calendar feeds
UPDATE public.event_feeds SET url = 'https://calendar.fsu.edu/api/2/events?days=90&pp=50', name = 'FSU Events Calendar (Localist)', is_active = true WHERE campus = 'fsu';
UPDATE public.event_feeds SET url = 'https://calendar.famu.edu/api/2/events?days=90&pp=50', name = 'FAMU Events Calendar (Localist)', is_active = true WHERE campus = 'famu';
UPDATE public.event_feeds SET url = 'https://ufl.campuslabs.com/engage/api/discovery/event/search?take=50&orderByField=endsOn&orderByDirection=ascending&status=Approved', name = 'UF Engage Events', is_active = true WHERE campus = 'uf';

-- 2. Disputes
CREATE TYPE public.dispute_status AS ENUM ('open','under_review','upheld','rejected');

CREATE TABLE public.market_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prediction_reference text,
  reason text NOT NULL,
  status public.dispute_status NOT NULL DEFAULT 'open',
  admin_note text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.market_disputes TO authenticated;
GRANT UPDATE ON public.market_disputes TO authenticated;
GRANT ALL ON public.market_disputes TO service_role;

ALTER TABLE public.market_disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users file their own disputes" ON public.market_disputes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users read their own disputes" ON public.market_disputes
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update disputes" ON public.market_disputes
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER market_disputes_touch BEFORE UPDATE ON public.market_disputes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. Leaderboard
CREATE OR REPLACE FUNCTION public.leaderboard(_campus public.campus_id DEFAULT NULL, _limit integer DEFAULT 25)
RETURNS TABLE(user_id uuid, label text, campus public.campus_id, settled integer, wins integer,
              accuracy integer, coins_won integer, balance integer, entries integer, open_positions integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id,
         COALESCE(NULLIF(p.username,''), 'student-' || substr(replace(p.id::text,'-',''),1,6)),
         CASE WHEN p.show_campus THEN p.campus ELSE NULL END,
         COALESCE(s.settled,0)::int,
         COALESCE(s.wins,0)::int,
         CASE WHEN COALESCE(s.settled,0) = 0 THEN 0
              ELSE round(100.0 * s.wins / s.settled)::int END,
         COALESCE(b.lifetime_won,0),
         COALESCE(b.balance,0),
         COALESCE(b.sweepstakes_entries,0),
         COALESCE(s.open_positions,0)::int
  FROM public.profiles p
  LEFT JOIN public.coin_balances b ON b.user_id = p.id
  LEFT JOIN (
    SELECT user_id,
           count(*) FILTER (WHERE outcome IS NOT NULL) AS settled,
           count(*) FILTER (WHERE outcome = 'WON') AS wins,
           count(*) FILTER (WHERE outcome IS NULL) AS open_positions
    FROM public.predictions GROUP BY user_id
  ) s ON s.user_id = p.id
  WHERE (_campus IS NULL OR p.campus = _campus)
  ORDER BY COALESCE(b.lifetime_won,0) DESC, COALESCE(s.wins,0) DESC, p.created_at ASC
  LIMIT LEAST(COALESCE(_limit,25), 100)
$$;

GRANT EXECUTE ON FUNCTION public.leaderboard(public.campus_id, integer) TO anon, authenticated;

-- 4. Public settled-market results
CREATE OR REPLACE FUNCTION public.market_results(_campus public.campus_id DEFAULT NULL, _limit integer DEFAULT 60)
RETURNS TABLE(market_id uuid, question text, detail text, campus public.campus_id, category text,
              outcome text, resolution_note text, resolved_at timestamptz, yes_odds integer, no_odds integer,
              total_predictions integer, winners integer, total_paid integer, entries_awarded integer,
              top_winner text, top_payout integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id, m.question, m.detail, m.campus, m.category, m.outcome, m.resolution_note, m.resolved_at,
         m.yes_odds, m.no_odds,
         COALESCE(a.total,0)::int, COALESCE(a.winners,0)::int, COALESCE(a.paid,0)::int, COALESCE(a.awarded,0)::int,
         t.label, COALESCE(t.payout,0)
  FROM public.markets m
  LEFT JOIN (
    SELECT market_id, count(*) AS total,
           count(*) FILTER (WHERE outcome = 'WON') AS winners,
           COALESCE(sum(payout),0) AS paid,
           COALESCE(sum(entries_awarded),0) AS awarded
    FROM public.predictions GROUP BY market_id
  ) a ON a.market_id = m.id::text
  LEFT JOIN LATERAL (
    SELECT COALESCE(NULLIF(pr.username,''), 'student-' || substr(replace(pr.id::text,'-',''),1,6)) AS label,
           pd.payout
    FROM public.predictions pd
    JOIN public.profiles pr ON pr.id = pd.user_id
    WHERE pd.market_id = m.id::text AND pd.outcome = 'WON'
    ORDER BY pd.payout DESC LIMIT 1
  ) t ON true
  WHERE m.status = 'resolved'
    AND (_campus IS NULL OR m.campus = _campus OR m.campus IS NULL)
  ORDER BY m.resolved_at DESC NULLS LAST
  LIMIT LEAST(COALESCE(_limit,60), 200)
$$;

GRANT EXECUTE ON FUNCTION public.market_results(public.campus_id, integer) TO anon, authenticated;

-- 5. Make the existing account an administrator
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users
ON CONFLICT (user_id, role) DO NOTHING;
