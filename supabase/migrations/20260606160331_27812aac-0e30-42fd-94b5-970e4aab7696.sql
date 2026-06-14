
-- Drop broken storage policies on machine-logs that used m.name instead of objects.name
DROP POLICY IF EXISTS "machine-logs region select" ON storage.objects;
DROP POLICY IF EXISTS "machine-logs region insert" ON storage.objects;
DROP POLICY IF EXISTS "machine-logs region update" ON storage.objects;
DROP POLICY IF EXISTS "machine-logs region delete" ON storage.objects;

-- Allow owners to delete their own diagnosis sessions
CREATE POLICY "Own delete sessions"
ON public.diagnosis_sessions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
