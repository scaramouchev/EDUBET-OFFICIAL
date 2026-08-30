-- campus enum
CREATE TYPE public.campus_id AS ENUM ('fsu', 'uf', 'famu');

CREATE OR REPLACE FUNCTION public.campus_from_email(_email text)
RETURNS public.campus_id
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN lower(_email) ~ '@([a-z0-9-]+\.)*fsu\.edu$' THEN 'fsu'::public.campus_id
    WHEN lower(_email) ~ '@([a-z0-9-]+\.)*famu\.edu$' THEN 'famu'::public.campus_id
    WHEN lower(_email) ~ '@([a-z0-9-]+\.)*ufl\.edu$' THEN 'uf'::public.campus_id
    ELSE NULL
  END
$$;

-- profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  campus public.campus_id,
  campus_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, campus, campus_verified)
  VALUES (
    NEW.id,
    NEW.email,
    public.campus_from_email(NEW.email),
    public.campus_from_email(NEW.email) IS NOT NULL AND NEW.email_confirmed_at IS NOT NULL
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_user_confirmed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND (OLD.email_confirmed_at IS NULL OR OLD.email IS DISTINCT FROM NEW.email) THEN
    UPDATE public.profiles
      SET email = NEW.email,
          campus = public.campus_from_email(NEW.email),
          campus_verified = public.campus_from_email(NEW.email) IS NOT NULL
      WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_confirmed
AFTER UPDATE ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_user_confirmed();

-- predictions (append-only, permanently locked)
CREATE TABLE public.predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  market_id text NOT NULL,
  market_question text NOT NULL,
  campus public.campus_id,
  side text NOT NULL CHECK (side IN ('YES', 'NO')),
  amount integer NOT NULL CHECK (amount > 0),
  locked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, market_id)
);

GRANT SELECT, INSERT ON public.predictions TO authenticated;
GRANT ALL ON public.predictions TO service_role;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own predictions"
  ON public.predictions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can lock in their own predictions"
  ON public.predictions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.predictions_are_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Predictions are permanently locked and cannot be changed or removed.';
END;
$$;

CREATE TRIGGER predictions_no_update
BEFORE UPDATE ON public.predictions
FOR EACH ROW EXECUTE FUNCTION public.predictions_are_immutable();

CREATE TRIGGER predictions_no_delete
BEFORE DELETE ON public.predictions
FOR EACH ROW EXECUTE FUNCTION public.predictions_are_immutable();

-- college requests
CREATE TABLE public.college_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  college_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.college_requests TO anon, authenticated;
GRANT ALL ON public.college_requests TO service_role;
ALTER TABLE public.college_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can request a college"
  ON public.college_requests FOR INSERT TO anon, authenticated
  WITH CHECK (true);