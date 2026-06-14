-- evidence-photos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence-photos', 'evidence-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Auth read evidence-photos" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'evidence-photos');

CREATE POLICY "Auth write evidence-photos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'evidence-photos');

CREATE POLICY "Auth update evidence-photos" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'evidence-photos');

CREATE POLICY "Auth delete evidence-photos" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'evidence-photos');

-- work_orders tablosuna evidence_photo_urls kolonu ekle
ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS evidence_photo_urls jsonb DEFAULT '[]'::jsonb;