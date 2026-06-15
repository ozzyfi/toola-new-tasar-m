
-- 1) Prevent privilege escalation via region self-update
CREATE OR REPLACE FUNCTION public.prevent_profile_region_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.region IS DISTINCT FROM OLD.region
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can change a profile region';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_region_escalation ON public.profiles;
CREATE TRIGGER profiles_prevent_region_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_region_escalation();

-- 2) Allow supervisors and admins to read all profiles (needed for technician lookup, user management)
DROP POLICY IF EXISTS "Supervisors and admins can view all profiles" ON public.profiles;
CREATE POLICY "Supervisors and admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'));

-- 3) Allow admins to delete profiles
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 4) Lock down SECURITY DEFINER trigger functions from being callable by API roles
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_profile_region_escalation() FROM PUBLIC, anon, authenticated;

-- 5) Restrict role/region helper functions to signed-in users only
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_region(uuid) FROM PUBLIC, anon;
