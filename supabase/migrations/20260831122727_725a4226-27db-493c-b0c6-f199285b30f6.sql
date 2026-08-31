
-- ROLES
CREATE TYPE public.app_role AS ENUM ('student','admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can read their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- COLLEGES
CREATE TABLE public.colleges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  short_name text NOT NULL,
  domain text NOT NULL UNIQUE,
  campus public.campus_id,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.colleges TO anon, authenticated;
GRANT ALL ON public.colleges TO service_role;
ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active colleges" ON public.colleges
  FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY "Admins manage colleges" ON public.colleges
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.colleges (name, short_name, domain, campus) VALUES
  ('Florida State University','FSU','fsu.edu','fsu'),
  ('Florida A&M University','FAMU','famu.edu','famu'),
  ('University of Florida','UF','ufl.edu','uf');

-- PROFILES
ALTER TABLE public.profiles
  ADD COLUMN username text UNIQUE,
  ADD COLUMN avatar_url text,
  ADD COLUMN bio text,
  ADD COLUMN show_campus boolean NOT NULL DEFAULT true,
  ADD COLUMN is_public boolean NOT NULL DEFAULT true,
  ADD COLUMN account_status text NOT NULL DEFAULT 'active',
  ADD COLUMN last_login_at timestamptz,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.protect_verified_profile_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(),'admin') THEN RETURN NEW; END IF;
  NEW.id := OLD.id;
  NEW.email := OLD.email;
  NEW.campus := OLD.campus;
  NEW.campus_verified := OLD.campus_verified;
  NEW.account_status := OLD.account_status;
  NEW.created_at := OLD.created_at;
  NEW.updated_at := now();
  IF NEW.username IS NOT NULL AND NEW.username !~ '^[a-zA-Z0-9_]{3,20}$' THEN
    RAISE EXCEPTION 'Username must be 3-20 characters, letters, numbers or underscore.';
  END IF;
  IF NEW.bio IS NOT NULL AND length(NEW.bio) > 280 THEN
    RAISE EXCEPTION 'Bio must be 280 characters or fewer.';
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER profiles_protect_identity BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_verified_profile_fields();

-- AUDIT LOG (append-only)
CREATE TABLE public.auth_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  success boolean NOT NULL DEFAULT true,
  ip_address text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_audit_log_user_idx ON public.auth_audit_log (user_id, created_at DESC);
CREATE INDEX auth_audit_log_created_idx ON public.auth_audit_log (created_at DESC);
GRANT SELECT ON public.auth_audit_log TO authenticated;
GRANT ALL ON public.auth_audit_log TO service_role;
ALTER TABLE public.auth_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read their own audit events" ON public.auth_audit_log
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.audit_log_is_immutable()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Audit log entries are immutable.';
END; $$;
CREATE TRIGGER auth_audit_log_no_update BEFORE UPDATE ON public.auth_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_is_immutable();
CREATE TRIGGER auth_audit_log_no_delete BEFORE DELETE ON public.auth_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_is_immutable();

-- SESSIONS
CREATE TABLE public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_fingerprint text NOT NULL,
  device text,
  browser text,
  platform text,
  ip_address text,
  user_agent text,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  UNIQUE (user_id, session_fingerprint)
);
CREATE INDEX user_sessions_user_idx ON public.user_sessions (user_id, last_seen_at DESC);
GRANT SELECT ON public.user_sessions TO authenticated;
GRANT ALL ON public.user_sessions TO service_role;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read their own sessions" ON public.user_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- VERIFICATION THROTTLE (no codes stored, counters only)
CREATE TABLE public.verification_throttle (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  purpose text NOT NULL,
  send_count integer NOT NULL DEFAULT 0,
  failed_attempts integer NOT NULL DEFAULT 0,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  last_sent_at timestamptz,
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email, purpose)
);
GRANT ALL ON public.verification_throttle TO service_role;
ALTER TABLE public.verification_throttle ENABLE ROW LEVEL SECURITY;

-- COLLEGE ACCESS REQUESTS
CREATE TYPE public.request_status AS ENUM ('pending','under_review','approved','denied');
CREATE TABLE public.access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  college_name text NOT NULL,
  email text NOT NULL,
  reason text NOT NULL,
  status public.request_status NOT NULL DEFAULT 'pending',
  admin_note text,
  ticket_code text NOT NULL UNIQUE DEFAULT ('REQ-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX access_requests_email_idx ON public.access_requests (lower(email));
GRANT SELECT, INSERT ON public.access_requests TO authenticated;
GRANT SELECT, UPDATE ON public.access_requests TO authenticated;
GRANT ALL ON public.access_requests TO service_role;
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read their own requests" ON public.access_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users create their own requests" ON public.access_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update requests" ON public.access_requests
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- PREDICTIONS: reference id + resolution
ALTER TABLE public.predictions
  ADD COLUMN reference_id text NOT NULL UNIQUE DEFAULT ('EB-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
  ADD COLUMN outcome text,
  ADD COLUMN resolved_at timestamptz;

CREATE OR REPLACE FUNCTION public.predictions_are_immutable()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Predictions are permanently locked and cannot be removed.';
  END IF;
  IF OLD.outcome IS NULL AND NEW.outcome IS NOT NULL
     AND NEW.user_id = OLD.user_id AND NEW.market_id = OLD.market_id
     AND NEW.side = OLD.side AND NEW.amount = OLD.amount
     AND NEW.locked_at = OLD.locked_at AND NEW.reference_id = OLD.reference_id THEN
    NEW.resolved_at := now();
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Predictions are permanently locked and cannot be changed.';
END; $$;

CREATE POLICY "Admins read all predictions" ON public.predictions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- new users default to the student role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, campus, campus_verified)
  VALUES (
    NEW.id,
    NEW.email,
    public.campus_from_email(NEW.email),
    public.campus_from_email(NEW.email) IS NOT NULL AND NEW.email_confirmed_at IS NOT NULL
  )
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END; $$;
