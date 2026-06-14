
-- 1. Fix machine-logs storage policies: use objects.name, not m.name
DROP POLICY IF EXISTS "machine_logs_select_region" ON storage.objects;
DROP POLICY IF EXISTS "machine_logs_insert_region" ON storage.objects;
DROP POLICY IF EXISTS "machine_logs_update_region" ON storage.objects;
DROP POLICY IF EXISTS "machine_logs_delete_region" ON storage.objects;

CREATE POLICY "machine_logs_select_region" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'machine-logs' AND EXISTS (
    SELECT 1 FROM public.machines m
    WHERE m.id::text = (storage.foldername(objects.name))[1]
      AND m.region = public.get_user_region(auth.uid())
  )
);

CREATE POLICY "machine_logs_insert_region" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'machine-logs' AND EXISTS (
    SELECT 1 FROM public.machines m
    WHERE m.id::text = (storage.foldername(objects.name))[1]
      AND m.region = public.get_user_region(auth.uid())
  )
);

CREATE POLICY "machine_logs_update_region" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'machine-logs' AND EXISTS (
    SELECT 1 FROM public.machines m
    WHERE m.id::text = (storage.foldername(objects.name))[1]
      AND m.region = public.get_user_region(auth.uid())
  )
);

CREATE POLICY "machine_logs_delete_region" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'machine-logs' AND EXISTS (
    SELECT 1 FROM public.machines m
    WHERE m.id::text = (storage.foldername(objects.name))[1]
      AND m.region = public.get_user_region(auth.uid())
  )
);

-- 2. correction_rules: region-scoped select, admins/supervisors see all
DROP POLICY IF EXISTS "Authenticated select rules" ON public.correction_rules;

CREATE POLICY "Region select correction_rules" ON public.correction_rules FOR SELECT TO authenticated
USING (region IS NULL OR region = public.get_user_region(auth.uid()));

CREATE POLICY "Admins/supervisors select all correction_rules" ON public.correction_rules FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'supervisor'::public.app_role));

-- 3. master_profiles: region-scoped select, admins/supervisors see all
DROP POLICY IF EXISTS "Authenticated select masters" ON public.master_profiles;

CREATE POLICY "Region select master_profiles" ON public.master_profiles FOR SELECT TO authenticated
USING (region = public.get_user_region(auth.uid()));

CREATE POLICY "Admins/supervisors select all master_profiles" ON public.master_profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'supervisor'::public.app_role));
