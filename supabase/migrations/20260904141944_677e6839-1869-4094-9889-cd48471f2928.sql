-- ============ ENUMS ============
CREATE TYPE public.market_status AS ENUM ('draft','open','closed','resolved','void');
CREATE TYPE public.sweepstakes_status AS ENUM ('upcoming','open','drawing','closed');
CREATE TYPE public.event_source AS ENUM ('seed','admin','feed');

-- ============ CAMPUS EVENTS ============
CREATE TABLE public.campus_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campus public.campus_id NOT NULL,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'Campus',
  location text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  source public.event_source NOT NULL DEFAULT 'admin',
  external_id text,
  url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campus, external_id)
);
GRANT SELECT ON public.campus_events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campus_events TO authenticated;
GRANT ALL ON public.campus_events TO service_role;
ALTER TABLE public.campus_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active events" ON public.campus_events
  FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY "Admins manage events" ON public.campus_events
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ EVENT FEEDS ============
CREATE TABLE public.event_feeds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campus public.campus_id NOT NULL,
  name text NOT NULL,
  url text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz,
  last_result text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_feeds TO authenticated;
GRANT ALL ON public.event_feeds TO service_role;
ALTER TABLE public.event_feeds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage feeds" ON public.event_feeds
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ MARKETS ============
CREATE TABLE public.markets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campus public.campus_id,
  category text NOT NULL DEFAULT 'Campus',
  question text NOT NULL,
  detail text,
  yes_odds integer NOT NULL DEFAULT 100,
  no_odds integer NOT NULL DEFAULT -120,
  closes_at timestamptz NOT NULL,
  status public.market_status NOT NULL DEFAULT 'open',
  outcome text,
  resolved_at timestamptz,
  resolution_note text,
  event_id uuid REFERENCES public.campus_events(id) ON DELETE SET NULL,
  sweepstakes_entries_reward integer NOT NULL DEFAULT 1,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT markets_outcome_valid CHECK (outcome IS NULL OR outcome IN ('YES','NO')),
  CONSTRAINT markets_odds_valid CHECK (abs(yes_odds) >= 100 AND abs(no_odds) >= 100)
);
GRANT SELECT ON public.markets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.markets TO authenticated;
GRANT ALL ON public.markets TO service_role;
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read published markets" ON public.markets
  FOR SELECT TO anon, authenticated USING (status <> 'draft');
CREATE POLICY "Admins manage markets" ON public.markets
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ COIN BALANCES ============
CREATE TABLE public.coin_balances (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 1000,
  sweepstakes_entries integer NOT NULL DEFAULT 0,
  lifetime_won integer NOT NULL DEFAULT 0,
  lifetime_staked integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coin_balance_nonneg CHECK (balance >= 0 AND sweepstakes_entries >= 0)
);
GRANT SELECT ON public.coin_balances TO authenticated;
GRANT ALL ON public.coin_balances TO service_role;
ALTER TABLE public.coin_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read their own balance" ON public.coin_balances
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- ============ COIN LEDGER ============
CREATE TABLE public.coin_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta integer NOT NULL,
  entries_delta integer NOT NULL DEFAULT 0,
  reason text NOT NULL,
  reference text,
  balance_after integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coin_ledger TO authenticated;
GRANT ALL ON public.coin_ledger TO service_role;
ALTER TABLE public.coin_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read their own ledger" ON public.coin_ledger
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.ledger_is_immutable() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN RAISE EXCEPTION 'Coin ledger entries are immutable.'; END; $$;
CREATE TRIGGER coin_ledger_no_update BEFORE UPDATE ON public.coin_ledger FOR EACH ROW EXECUTE FUNCTION public.ledger_is_immutable();
CREATE TRIGGER coin_ledger_no_delete BEFORE DELETE ON public.coin_ledger FOR EACH ROW EXECUTE FUNCTION public.ledger_is_immutable();

-- ============ SWEEPSTAKES ============
CREATE TABLE public.sweepstakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campus public.campus_id,
  title text NOT NULL,
  prize text NOT NULL,
  description text,
  entry_cost integer NOT NULL DEFAULT 1,
  draws_at timestamptz NOT NULL,
  status public.sweepstakes_status NOT NULL DEFAULT 'open',
  winner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  drawn_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sweepstakes_cost_valid CHECK (entry_cost >= 1)
);
GRANT SELECT ON public.sweepstakes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sweepstakes TO authenticated;
GRANT ALL ON public.sweepstakes TO service_role;
ALTER TABLE public.sweepstakes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read sweepstakes" ON public.sweepstakes
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage sweepstakes" ON public.sweepstakes
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.sweepstakes_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sweepstakes_id uuid NOT NULL REFERENCES public.sweepstakes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entries integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sweepstakes_entries_positive CHECK (entries >= 1)
);
GRANT SELECT ON public.sweepstakes_entries TO authenticated;
GRANT ALL ON public.sweepstakes_entries TO service_role;
ALTER TABLE public.sweepstakes_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read their own sweepstakes entries" ON public.sweepstakes_entries
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- ============ PREDICTIONS: odds + payout ============
ALTER TABLE public.predictions
  ADD COLUMN odds integer NOT NULL DEFAULT 100,
  ADD COLUMN payout integer NOT NULL DEFAULT 0,
  ADD COLUMN entries_awarded integer NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS predictions_one_per_market ON public.predictions (user_id, market_id);

-- allow settlement fields to be written exactly once alongside outcome
CREATE OR REPLACE FUNCTION public.predictions_are_immutable()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Predictions are permanently locked and cannot be removed.';
  END IF;
  IF OLD.outcome IS NULL AND NEW.outcome IS NOT NULL
     AND NEW.user_id = OLD.user_id AND NEW.market_id = OLD.market_id
     AND NEW.side = OLD.side AND NEW.amount = OLD.amount
     AND NEW.odds = OLD.odds
     AND NEW.locked_at = OLD.locked_at AND NEW.reference_id = OLD.reference_id THEN
    NEW.resolved_at := now();
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Predictions are permanently locked and cannot be changed.';
END; $function$;

-- ============ BALANCE BOOTSTRAP ============
CREATE OR REPLACE FUNCTION public.ensure_balance(_user uuid) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  INSERT INTO public.coin_balances (user_id) VALUES (_user) ON CONFLICT (user_id) DO NOTHING;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, campus, campus_verified)
  VALUES (
    NEW.id, NEW.email,
    public.campus_from_email(NEW.email),
    public.campus_from_email(NEW.email) IS NOT NULL AND NEW.email_confirmed_at IS NOT NULL
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student') ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.coin_balances (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $function$;

INSERT INTO public.coin_balances (user_id) SELECT id FROM auth.users ON CONFLICT (user_id) DO NOTHING;

-- ============ STAKE DEDUCTION ON LOCK ============
CREATE OR REPLACE FUNCTION public.charge_locked_prediction() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE m public.markets%ROWTYPE; new_balance integer;
BEGIN
  BEGIN
    SELECT * INTO m FROM public.markets WHERE id = NEW.market_id::uuid;
  EXCEPTION WHEN others THEN m := NULL; END;

  IF m.id IS NOT NULL THEN
    IF m.status <> 'open' OR m.closes_at <= now() THEN
      RAISE EXCEPTION 'This market is closed to new predictions.';
    END IF;
    NEW.odds := CASE WHEN NEW.side = 'YES' THEN m.yes_odds ELSE m.no_odds END;
    NEW.market_question := m.question;
    NEW.campus := COALESCE(NEW.campus, m.campus);
  END IF;

  INSERT INTO public.coin_balances (user_id) VALUES (NEW.user_id) ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.coin_balances
     SET balance = balance - NEW.amount,
         lifetime_staked = lifetime_staked + NEW.amount,
         updated_at = now()
   WHERE user_id = NEW.user_id AND balance >= NEW.amount
   RETURNING balance INTO new_balance;

  IF new_balance IS NULL THEN
    RAISE EXCEPTION 'Not enough Campus Coins to lock this prediction.';
  END IF;

  INSERT INTO public.coin_ledger (user_id, delta, reason, reference, balance_after)
  VALUES (NEW.user_id, -NEW.amount, 'prediction_stake', NEW.reference_id, new_balance);

  RETURN NEW;
END; $function$;

CREATE TRIGGER predictions_charge_stake BEFORE INSERT ON public.predictions
  FOR EACH ROW EXECUTE FUNCTION public.charge_locked_prediction();

-- ============ RESOLUTION / PAYOUT ============
CREATE OR REPLACE FUNCTION public.resolve_market(_market_id uuid, _outcome text, _note text DEFAULT NULL)
RETURNS TABLE (settled integer, winners integer, paid integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  m public.markets%ROWTYPE; p RECORD;
  profit integer; total_return integer; awarded integer; new_balance integer;
  n_settled integer := 0; n_winners integer := 0; n_paid integer := 0;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only administrators can resolve markets.';
  END IF;
  IF _outcome NOT IN ('YES','NO') THEN RAISE EXCEPTION 'Outcome must be YES or NO.'; END IF;

  SELECT * INTO m FROM public.markets WHERE id = _market_id FOR UPDATE;
  IF m.id IS NULL THEN RAISE EXCEPTION 'Market not found.'; END IF;
  IF m.status = 'resolved' THEN RAISE EXCEPTION 'This market is already resolved. Resolutions are final.'; END IF;

  FOR p IN SELECT * FROM public.predictions
           WHERE market_id = _market_id::text AND outcome IS NULL FOR UPDATE
  LOOP
    IF p.side = _outcome THEN
      profit := CASE WHEN p.odds > 0
                     THEN round(p.amount * p.odds / 100.0)
                     ELSE round(p.amount * 100.0 / abs(p.odds)) END;
      total_return := p.amount + profit;
      awarded := GREATEST(m.sweepstakes_entries_reward, (profit / 100));

      UPDATE public.coin_balances
         SET balance = balance + total_return,
             sweepstakes_entries = sweepstakes_entries + awarded,
             lifetime_won = lifetime_won + profit,
             updated_at = now()
       WHERE user_id = p.user_id
       RETURNING balance INTO new_balance;

      INSERT INTO public.coin_ledger (user_id, delta, entries_delta, reason, reference, balance_after)
      VALUES (p.user_id, total_return, awarded, 'prediction_payout', p.reference_id, new_balance);

      UPDATE public.predictions
         SET outcome = 'WON', payout = total_return, entries_awarded = awarded
       WHERE id = p.id;

      n_winners := n_winners + 1;
      n_paid := n_paid + total_return;
    ELSE
      UPDATE public.predictions SET outcome = 'LOST', payout = 0 WHERE id = p.id;
    END IF;
    n_settled := n_settled + 1;
  END LOOP;

  UPDATE public.markets
     SET status = 'resolved', outcome = _outcome, resolved_at = now(),
         resolution_note = _note, updated_at = now()
   WHERE id = _market_id;

  RETURN QUERY SELECT n_settled, n_winners, n_paid;
END; $function$;

-- ============ SWEEPSTAKES ENTRY ============
CREATE OR REPLACE FUNCTION public.enter_sweepstakes(_sweepstakes_id uuid, _entries integer DEFAULT 1)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE s public.sweepstakes%ROWTYPE; cost integer; remaining integer; uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'You must be signed in.'; END IF;
  IF _entries < 1 THEN RAISE EXCEPTION 'Enter at least one entry.'; END IF;
  SELECT * INTO s FROM public.sweepstakes WHERE id = _sweepstakes_id;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Sweepstakes not found.'; END IF;
  IF s.status <> 'open' OR s.draws_at <= now() THEN RAISE EXCEPTION 'This drawing is closed.'; END IF;

  cost := s.entry_cost * _entries;
  UPDATE public.coin_balances
     SET sweepstakes_entries = sweepstakes_entries - cost, updated_at = now()
   WHERE user_id = uid AND sweepstakes_entries >= cost
   RETURNING sweepstakes_entries INTO remaining;
  IF remaining IS NULL THEN RAISE EXCEPTION 'Not enough sweepstakes entries. Win predictions to earn more.'; END IF;

  INSERT INTO public.sweepstakes_entries (sweepstakes_id, user_id, entries) VALUES (_sweepstakes_id, uid, _entries);
  INSERT INTO public.coin_ledger (user_id, delta, entries_delta, reason, reference, balance_after)
  SELECT uid, 0, -cost, 'sweepstakes_entry', s.title, balance FROM public.coin_balances WHERE user_id = uid;
  RETURN remaining;
END; $function$;

CREATE OR REPLACE FUNCTION public.draw_sweepstakes(_sweepstakes_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE winner uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Only administrators can draw winners.'; END IF;
  IF EXISTS (SELECT 1 FROM public.sweepstakes WHERE id = _sweepstakes_id AND winner_user_id IS NOT NULL) THEN
    RAISE EXCEPTION 'A winner has already been drawn.';
  END IF;
  SELECT user_id INTO winner FROM (
    SELECT user_id, generate_series(1, entries) FROM public.sweepstakes_entries WHERE sweepstakes_id = _sweepstakes_id
  ) tickets ORDER BY random() LIMIT 1;
  IF winner IS NULL THEN RAISE EXCEPTION 'No entries yet.'; END IF;
  UPDATE public.sweepstakes SET winner_user_id = winner, drawn_at = now(), status = 'closed', updated_at = now()
   WHERE id = _sweepstakes_id;
  RETURN winner;
END; $function$;

-- ============ updated_at ============
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'public' AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER campus_events_touch BEFORE UPDATE ON public.campus_events FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER event_feeds_touch BEFORE UPDATE ON public.event_feeds FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER markets_touch BEFORE UPDATE ON public.markets FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER sweepstakes_touch BEFORE UPDATE ON public.sweepstakes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ SEED CAMPUS EVENTS + MARKETS + SWEEPSTAKES ============
INSERT INTO public.campus_events (campus, title, description, category, location, starts_at, source) VALUES
 ('fsu','FSU vs. Florida — Rivalry Game','Annual in-state rivalry football matchup.','Sports','Doak Campbell Stadium', now() + interval '3 days','seed'),
 ('fsu','Market Wednesday','Weekly student market on Landis Green.','Campus','Landis Green', now() + interval '1 day','seed'),
 ('fsu','SGA Senate Session','Open senate session and first-reading votes.','Politics','Oglesby Union', now() + interval '2 days','seed'),
 ('fsu','Strozier Late Night','Extended finals-week library hours.','Campus','Strozier Library', now() + interval '5 days','seed'),
 ('famu','FAMU Homecoming Parade','Rattler homecoming parade through campus.','Campus','Wahnish Way', now() + interval '6 days','seed'),
 ('famu','Marching 100 Showcase','Halftime showcase performance.','Sports','Bragg Memorial Stadium', now() + interval '4 days','seed'),
 ('famu','SGA Town Hall','Student government open forum.','Politics','Lee Hall Auditorium', now() + interval '2 days','seed'),
 ('uf','Gator Growl','Student-run pep rally and comedy showcase.','Campus','Ben Hill Griffin Stadium', now() + interval '7 days','seed'),
 ('uf','UF vs. FSU — Rivalry Game','Annual in-state rivalry football matchup.','Sports','Ben Hill Griffin Stadium', now() + interval '3 days','seed'),
 ('uf','Turlington Plaza Rush','Peak-hour plaza activity window.','Campus Chaos','Turlington Plaza', now() + interval '1 day','seed');

INSERT INTO public.markets (campus, category, question, detail, yes_odds, no_odds, closes_at, status, event_id, sweepstakes_entries_reward)
SELECT e.campus, 'Sports', 'Will FSU beat UF in the rivalry game?', 'Resolved from the official final scoreboard.', 140, -170, e.starts_at, 'open', e.id, 2
FROM public.campus_events e WHERE e.title = 'FSU vs. Florida — Rivalry Game';

INSERT INTO public.markets (campus, category, question, detail, yes_odds, no_odds, closes_at, status, event_id)
SELECT e.campus, 'Politics', 'Will the SGA senate bill pass on first vote?', 'Resolved from published senate minutes.', -140, 120, e.starts_at, 'open', e.id
FROM public.campus_events e WHERE e.title = 'SGA Senate Session';

INSERT INTO public.markets (campus, category, question, detail, yes_odds, no_odds, closes_at, status, event_id)
SELECT e.campus, 'Campus Chaos', 'Will someone get chased by a goose near Landis Green this week?', 'Resolved by campus consensus review.', -250, 190, e.starts_at, 'open', e.id
FROM public.campus_events e WHERE e.title = 'Market Wednesday';

INSERT INTO public.markets (campus, category, question, detail, yes_odds, no_odds, closes_at, status, event_id)
SELECT e.campus, 'Campus', 'Will the Marching 100 debut a new halftime set?', 'Resolved from the official program.', 165, -200, e.starts_at, 'open', e.id
FROM public.campus_events e WHERE e.title = 'Marching 100 Showcase';

INSERT INTO public.markets (campus, category, question, detail, yes_odds, no_odds, closes_at, status, event_id)
SELECT e.campus, 'Campus', 'Will Gator Growl sell out student tickets?', 'Resolved from the ticketing office.', 120, -145, e.starts_at, 'open', e.id
FROM public.campus_events e WHERE e.title = 'Gator Growl';

INSERT INTO public.sweepstakes (campus, title, prize, description, entry_cost, draws_at, status) VALUES
 ('fsu','Garnet & Gold Game Day Drop','2 lower-bowl rivalry game tickets','Earn entries by winning predictions, then enter the drawing.',3, now() + interval '10 days','open'),
 ('famu','Rattler Bookstore Run','$250 campus bookstore credit','Open to verified FAMU students.',2, now() + interval '14 days','open'),
 ('uf','Swamp Weekend','Gator Growl VIP pair + merch bundle','Open to verified UF students.',3, now() + interval '12 days','open'),
 (NULL,'Statewide Semester Saver','$500 tuition credit','Open to every verified campus.',5, now() + interval '30 days','open');

INSERT INTO public.event_feeds (campus, name, url, is_active) VALUES
 ('fsu','FSU Events Calendar','https://calendar.fsu.edu/calendar.json', false),
 ('famu','FAMU Events Calendar','https://www.famu.edu/events/feed.json', false),
 ('uf','UF Events Calendar','https://calendar.ufl.edu/calendar.json', false);