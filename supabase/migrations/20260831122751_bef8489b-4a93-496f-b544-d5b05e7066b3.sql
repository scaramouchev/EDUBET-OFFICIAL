
REVOKE ALL ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_user_confirmed() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.predictions_are_immutable() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_log_is_immutable() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_verified_profile_fields() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

GRANT SELECT ON public.verification_throttle TO authenticated;
CREATE POLICY "Admins read verification throttle" ON public.verification_throttle
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
