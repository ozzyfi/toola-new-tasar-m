
-- Drop any existing object policies for these buckets
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT polname FROM pg_policy
    WHERE polrelid = 'storage.objects'::regclass
      AND (
        pg_get_expr(polqual, polrelid) LIKE '%repair-videos%'
        OR pg_get_expr(polqual, polrelid) LIKE '%machine-logs%'
        OR pg_get_expr(polqual, polrelid) LIKE '%pow-reports%'
        OR pg_get_expr(polqual, polrelid) LIKE '%evidence-photos%'
        OR pg_get_expr(polwithcheck, polrelid) LIKE '%repair-videos%'
        OR pg_get_expr(polwithcheck, polrelid) LIKE '%machine-logs%'
        OR pg_get_expr(polwithcheck, polrelid) LIKE '%pow-reports%'
        OR pg_get_expr(polwithcheck, polrelid) LIKE '%evidence-photos%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.polname);
  END LOOP;
END $$;

-- machine-logs: first folder = machine_id (uuid); region must match
CREATE POLICY "machine-logs region select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'machine-logs'
  AND EXISTS (
    SELECT 1 FROM public.machines m
    WHERE m.id::text = (storage.foldername(name))[1]
      AND m.region = public.get_user_region(auth.uid())
  )
);

CREATE POLICY "machine-logs region insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'machine-logs'
  AND EXISTS (
    SELECT 1 FROM public.machines m
    WHERE m.id::text = (storage.foldername(name))[1]
      AND m.region = public.get_user_region(auth.uid())
  )
);

CREATE POLICY "machine-logs region update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'machine-logs'
  AND EXISTS (
    SELECT 1 FROM public.machines m
    WHERE m.id::text = (storage.foldername(name))[1]
      AND m.region = public.get_user_region(auth.uid())
  )
);

CREATE POLICY "machine-logs region delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'machine-logs'
  AND EXISTS (
    SELECT 1 FROM public.machines m
    WHERE m.id::text = (storage.foldername(name))[1]
      AND m.region = public.get_user_region(auth.uid())
  )
);

-- repair-videos, pow-reports, evidence-photos: first folder = wo_id (uuid)
DO $$
DECLARE b text;
BEGIN
  FOREACH b IN ARRAY ARRAY['repair-videos','pow-reports','evidence-photos']
  LOOP
    EXECUTE format($q$
      CREATE POLICY %I ON storage.objects FOR SELECT TO authenticated
      USING (
        bucket_id = %L
        AND EXISTS (
          SELECT 1 FROM public.work_orders w
          WHERE w.id::text = (storage.foldername(name))[1]
            AND w.region = public.get_user_region(auth.uid())
        )
      );
    $q$, b || ' region select', b);

    EXECUTE format($q$
      CREATE POLICY %I ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = %L
        AND EXISTS (
          SELECT 1 FROM public.work_orders w
          WHERE w.id::text = (storage.foldername(name))[1]
            AND w.region = public.get_user_region(auth.uid())
        )
      );
    $q$, b || ' region insert', b);

    EXECUTE format($q$
      CREATE POLICY %I ON storage.objects FOR UPDATE TO authenticated
      USING (
        bucket_id = %L
        AND EXISTS (
          SELECT 1 FROM public.work_orders w
          WHERE w.id::text = (storage.foldername(name))[1]
            AND w.region = public.get_user_region(auth.uid())
        )
      );
    $q$, b || ' region update', b);

    EXECUTE format($q$
      CREATE POLICY %I ON storage.objects FOR DELETE TO authenticated
      USING (
        bucket_id = %L
        AND EXISTS (
          SELECT 1 FROM public.work_orders w
          WHERE w.id::text = (storage.foldername(name))[1]
            AND w.region = public.get_user_region(auth.uid())
        )
      );
    $q$, b || ' region delete', b);
  END LOOP;
END $$;
