
-- 1) user_roles: explicit restrictive policy to block self-escalation
CREATE POLICY "Only admins can insert roles"
ON public.user_roles AS RESTRICTIVE
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Only admins can update roles"
ON public.user_roles AS RESTRICTIVE
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles AS RESTRICTIVE
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2) corrections / learning_cases: UPDATE policies
CREATE POLICY "Owners or supervisors update corrections"
ON public.corrections
FOR UPDATE TO authenticated
USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'supervisor'::public.app_role))
WITH CHECK (auth.uid() = created_by OR public.has_role(auth.uid(), 'supervisor'::public.app_role));

CREATE POLICY "Supervisors select all corrections"
ON public.corrections
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'supervisor'::public.app_role));

CREATE POLICY "Owners or supervisors update learning_cases"
ON public.learning_cases
FOR UPDATE TO authenticated
USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'supervisor'::public.app_role))
WITH CHECK (auth.uid() = created_by OR public.has_role(auth.uid(), 'supervisor'::public.app_role));

CREATE POLICY "Supervisors select all learning_cases"
ON public.learning_cases
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'supervisor'::public.app_role));

-- 3) Admin DELETE policies on operational tables
CREATE POLICY "Admins delete machines" ON public.machines
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins delete work_orders" ON public.work_orders
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins delete machine_logs" ON public.machine_logs
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins delete repair_videos" ON public.repair_videos
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins delete machine_service_history" ON public.machine_service_history
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins delete work_order_parts" ON public.work_order_parts
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins delete technicians" ON public.technicians
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins delete master_profiles" ON public.master_profiles
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins delete correction_rules" ON public.correction_rules
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Supervisors delete corrections" ON public.corrections
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'supervisor'::public.app_role) OR auth.uid() = created_by);

CREATE POLICY "Supervisors delete learning_cases" ON public.learning_cases
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'supervisor'::public.app_role) OR auth.uid() = created_by);

-- 4) Revoke direct execute on SECURITY DEFINER helpers (RLS policies still work)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_user_region(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
