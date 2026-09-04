-- Internal / trigger-only functions: not callable through the API at all
REVOKE ALL ON FUNCTION public.ensure_balance(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_user_confirmed() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.charge_locked_prediction() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ledger_is_immutable() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_log_is_immutable() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.predictions_are_immutable() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_verified_profile_fields() FROM PUBLIC, anon, authenticated;

-- Callable only by signed-in users; each verifies permissions internally
REVOKE ALL ON FUNCTION public.resolve_market(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_market(uuid, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.draw_sweepstakes(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.draw_sweepstakes(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.enter_sweepstakes(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enter_sweepstakes(uuid, integer) TO authenticated;

-- Role check is used by RLS policies for signed-in users only
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
REVOKE ALL ON FUNCTION public.campus_from_email(text) FROM PUBLIC, anon, authenticated;