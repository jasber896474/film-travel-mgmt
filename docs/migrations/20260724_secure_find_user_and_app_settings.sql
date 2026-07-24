-- Applied via Supabase MCP on 2026-07-24 (project knoudnzjnfkfhiizgcna)
-- Restrict email lookup RPC and lock down app_settings.

REVOKE ALL ON FUNCTION public.find_user_id_by_email(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.find_user_id_by_email(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.find_user_id_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_user_id_by_email(text) TO service_role;

REVOKE ALL ON TABLE public.app_settings FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.app_settings TO service_role;

DROP POLICY IF EXISTS "app_settings_owner_select" ON public.app_settings;
CREATE POLICY "app_settings_owner_select"
  ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (private.is_system_owner());
