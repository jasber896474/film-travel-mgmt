-- List project members with email (for Member Manager UI).
-- Apply in Supabase SQL Editor (project knoudnzjnfkfhiizgcna).

CREATE OR REPLACE FUNCTION public.list_project_member_labels(p_project_id integer)
RETURNS TABLE(user_id uuid, email text, display_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, private
AS $$
  SELECT up.user_id, au.email::text, NULL::text AS display_name
  FROM public.user_projects up
  JOIN auth.users au ON au.id = up.user_id
  WHERE up.project_id = p_project_id
    AND private.can_read_project(p_project_id);
$$;

REVOKE ALL ON FUNCTION public.list_project_member_labels(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_project_member_labels(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.list_project_member_labels(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_project_member_labels(integer) TO service_role;
