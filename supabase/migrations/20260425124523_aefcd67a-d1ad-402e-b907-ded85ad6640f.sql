
CREATE TYPE public.app_role AS ENUM ('admin', 'supervisor', 'technician');

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text, region text, client text, role text DEFAULT 'technician',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'technician');
  RETURN NEW;
END;
$$;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.get_user_region(_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT region FROM public.profiles WHERE id = _user_id
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.machines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, model text, serial_no text,
  city text, district text, region text, client text,
  status text DEFAULT 'ok', operating_hours integer DEFAULT 0,
  last_service date, next_maintenance date,
  alert_text text, risk_score integer DEFAULT 0, risk_note text, risk_next_date text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_machines_updated_at BEFORE UPDATE ON public.machines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Region select machines" ON public.machines
  FOR SELECT TO authenticated USING (region = public.get_user_region(auth.uid()));
CREATE POLICY "Region insert machines" ON public.machines
  FOR INSERT TO authenticated WITH CHECK (region = public.get_user_region(auth.uid()));
CREATE POLICY "Region update machines" ON public.machines
  FOR UPDATE TO authenticated USING (region = public.get_user_region(auth.uid()));

CREATE TABLE public.technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL, region text, city text,
  experience_years integer DEFAULT 0, client text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_technicians_updated_at BEFORE UPDATE ON public.technicians
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Region select technicians" ON public.technicians
  FOR SELECT TO authenticated USING (region = public.get_user_region(auth.uid()));
CREATE POLICY "Region insert technicians" ON public.technicians
  FOR INSERT TO authenticated WITH CHECK (region = public.get_user_region(auth.uid()));
CREATE POLICY "Region update technicians" ON public.technicians
  FOR UPDATE TO authenticated USING (region = public.get_user_region(auth.uid()));

CREATE TABLE public.work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid REFERENCES public.machines(id) ON DELETE SET NULL,
  code text UNIQUE NOT NULL, alarm_code text, complaint text, description text,
  status text DEFAULT 'open', badge text DEFAULT 'scheduled',
  region text, city text, district text, client text,
  assigned_technician_id uuid REFERENCES public.technicians(id) ON DELETE SET NULL,
  closed_at timestamptz, closing_notes jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_work_orders_updated_at BEFORE UPDATE ON public.work_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Region select work_orders" ON public.work_orders
  FOR SELECT TO authenticated USING (region = public.get_user_region(auth.uid()));
CREATE POLICY "Region insert work_orders" ON public.work_orders
  FOR INSERT TO authenticated WITH CHECK (region = public.get_user_region(auth.uid()));
CREATE POLICY "Region update work_orders" ON public.work_orders
  FOR UPDATE TO authenticated USING (region = public.get_user_region(auth.uid()));

CREATE TABLE public.work_order_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wo_id uuid REFERENCES public.work_orders(id) ON DELETE CASCADE,
  part_name text NOT NULL, part_no text,
  probability integer DEFAULT 0, stock_count integer DEFAULT 0,
  stock_status text DEFAULT 'ok',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.work_order_parts ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_wop_updated_at BEFORE UPDATE ON public.work_order_parts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Region select wop" ON public.work_order_parts
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.work_orders w WHERE w.id = wo_id AND w.region = public.get_user_region(auth.uid()))
  );
CREATE POLICY "Region insert wop" ON public.work_order_parts
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.work_orders w WHERE w.id = wo_id AND w.region = public.get_user_region(auth.uid()))
  );
CREATE POLICY "Region update wop" ON public.work_order_parts
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.work_orders w WHERE w.id = wo_id AND w.region = public.get_user_region(auth.uid()))
  );

CREATE TABLE public.master_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, region text NOT NULL, city text,
  experience_years integer DEFAULT 0, domain text,
  work_md text, persona_md text,
  is_active boolean DEFAULT true, version integer DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.master_profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_master_profiles_updated_at BEFORE UPDATE ON public.master_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Authenticated select masters" ON public.master_profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Supervisors insert masters" ON public.master_profiles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'supervisor'));
CREATE POLICY "Supervisors update masters" ON public.master_profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'supervisor'));

CREATE TABLE public.correction_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_profile_id uuid REFERENCES public.master_profiles(id) ON DELETE CASCADE,
  region text, scene_pattern text, wrong text, correct text, lesson text,
  applied_count integer DEFAULT 0, is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.correction_rules ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_correction_rules_updated_at BEFORE UPDATE ON public.correction_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Authenticated select rules" ON public.correction_rules
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Supervisors insert rules" ON public.correction_rules
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'supervisor'));
CREATE POLICY "Supervisors update rules" ON public.correction_rules
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'supervisor'));

CREATE TABLE public.corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene text, wrong text, correct text, lesson text, bolge text, usta text,
  wo_id uuid REFERENCES public.work_orders(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.corrections ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_corrections_updated_at BEFORE UPDATE ON public.corrections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Own select corrections" ON public.corrections
  FOR SELECT TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Own insert corrections" ON public.corrections
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE TABLE public.learning_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alarm text, diagnosis text, success boolean DEFAULT true,
  usta text, bolge text, month text,
  machine_id uuid REFERENCES public.machines(id) ON DELETE SET NULL,
  wo_id uuid REFERENCES public.work_orders(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.learning_cases ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_learning_cases_updated_at BEFORE UPDATE ON public.learning_cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Own select learning_cases" ON public.learning_cases
  FOR SELECT TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Own insert learning_cases" ON public.learning_cases
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE TABLE public.diagnosis_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  wo_id uuid REFERENCES public.work_orders(id) ON DELETE SET NULL,
  machine_id uuid REFERENCES public.machines(id) ON DELETE SET NULL,
  machine_name text, title text, status text DEFAULT 'active',
  turns jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.diagnosis_sessions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_diagnosis_sessions_updated_at BEFORE UPDATE ON public.diagnosis_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Own select sessions" ON public.diagnosis_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own insert sessions" ON public.diagnosis_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own update sessions" ON public.diagnosis_sessions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.machine_service_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid REFERENCES public.machines(id) ON DELETE CASCADE,
  service_date date NOT NULL, description text NOT NULL,
  duration_hours numeric(4,1),
  wo_id uuid REFERENCES public.work_orders(id) ON DELETE SET NULL,
  technician_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.machine_service_history ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_msh_updated_at BEFORE UPDATE ON public.machine_service_history
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Region select msh" ON public.machine_service_history
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.machines m WHERE m.id = machine_id AND m.region = public.get_user_region(auth.uid()))
  );
CREATE POLICY "Region insert msh" ON public.machine_service_history
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.machines m WHERE m.id = machine_id AND m.region = public.get_user_region(auth.uid()))
  );
CREATE POLICY "Region update msh" ON public.machine_service_history
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.machines m WHERE m.id = machine_id AND m.region = public.get_user_region(auth.uid()))
  );

CREATE TABLE public.machine_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid REFERENCES public.machines(id) ON DELETE CASCADE,
  file_name text, storage_path text, status text DEFAULT 'uploaded',
  findings jsonb, recommendations jsonb, recurring_match jsonb, error_msg text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.machine_logs ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_machine_logs_updated_at BEFORE UPDATE ON public.machine_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Region select logs" ON public.machine_logs
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.machines m WHERE m.id = machine_id AND m.region = public.get_user_region(auth.uid()))
  );
CREATE POLICY "Region insert logs" ON public.machine_logs
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.machines m WHERE m.id = machine_id AND m.region = public.get_user_region(auth.uid()))
  );
CREATE POLICY "Region update logs" ON public.machine_logs
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.machines m WHERE m.id = machine_id AND m.region = public.get_user_region(auth.uid()))
  );

CREATE TABLE public.repair_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wo_id uuid REFERENCES public.work_orders(id) ON DELETE CASCADE,
  machine_id uuid REFERENCES public.machines(id) ON DELETE SET NULL,
  storage_path text, status text DEFAULT 'uploaded',
  summary text, sop_steps jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.repair_videos ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_repair_videos_updated_at BEFORE UPDATE ON public.repair_videos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Region select videos" ON public.repair_videos
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.work_orders w WHERE w.id = wo_id AND w.region = public.get_user_region(auth.uid()))
  );
CREATE POLICY "Region insert videos" ON public.repair_videos
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.work_orders w WHERE w.id = wo_id AND w.region = public.get_user_region(auth.uid()))
  );
CREATE POLICY "Region update videos" ON public.repair_videos
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.work_orders w WHERE w.id = wo_id AND w.region = public.get_user_region(auth.uid()))
  );

INSERT INTO storage.buckets (id, name, public) VALUES
  ('repair-videos', 'repair-videos', false),
  ('machine-logs', 'machine-logs', false),
  ('pow-reports', 'pow-reports', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Auth read repair-videos" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'repair-videos');
CREATE POLICY "Auth write repair-videos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'repair-videos');
CREATE POLICY "Auth update repair-videos" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'repair-videos');
CREATE POLICY "Auth read machine-logs" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'machine-logs');
CREATE POLICY "Auth write machine-logs" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'machine-logs');
CREATE POLICY "Auth update machine-logs" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'machine-logs');
CREATE POLICY "Auth read pow-reports" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'pow-reports');
CREATE POLICY "Auth write pow-reports" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'pow-reports');
CREATE POLICY "Auth update pow-reports" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'pow-reports');

INSERT INTO public.machines (name, model, city, district, region, status, operating_hours, last_service, alert_text, risk_score, risk_note, risk_next_date) VALUES
  ('BSF 36-4.16H Bom Pompası', 'BSF 36-4.16H', 'İstanbul', 'Başakşehir', 'Marmara', 'fault', 4820, DATE '2026-03-10', 'WO-4471 devam ediyor · H-201', 74, 'H-201 arızası tekrar riski yüksek', '15 Haziran 2026'),
  ('BSF 24-3.12H Bom Pompası', 'BSF 24-3.12H', 'İstanbul', 'Kadıköy', 'Marmara', 'ok', 2340, DATE '2026-04-02', NULL, 0, NULL, NULL),
  ('BSA 2109H Sabit Pompa', 'BSA 2109H', 'İstanbul', 'Pendik', 'Marmara', 'service', 1953, NULL, '2000 saatlik bakıma 47 saat kaldı', 45, NULL, NULL),
  ('BSF 36-4.16H Bom Pompası #2', 'BSF 36-4.16H', 'İstanbul', 'Esenyurt', 'Marmara', 'ok', 1100, NULL, NULL, 0, NULL, NULL),
  ('M-402 Mikser', 'M-402', 'İstanbul', 'Tuzla', 'Marmara', 'ok', 890, NULL, NULL, 0, NULL, NULL),
  ('BSA 1005 Sabit Pompa', 'BSA 1005', 'Ankara', 'Çankaya', 'İç Anadolu', 'busy', 3210, NULL, 'WO-4467 sıraya alındı · P-105', 52, NULL, NULL),
  ('BSF 32-4.14H Bom Pompası', 'BSF 32-4.14H', 'Ankara', 'Keçiören', 'İç Anadolu', 'ok', 1540, NULL, 'Yağ değişimi 1500 saati aştı', 38, NULL, NULL),
  ('BSF 42-5.16H Bom Pompası', 'BSF 42-5.16H', 'Ankara', 'Mamak', 'İç Anadolu', 'ok', 720, NULL, NULL, 0, NULL, NULL),
  ('BSF 42-5.16H Bom Pompası', 'BSF 42-5.16H', 'İzmir', 'Konak', 'Ege', 'ok', 2100, NULL, NULL, 0, NULL, NULL),
  ('BSA 14000H Sabit Pompa', 'BSA 14000H', 'İzmir', 'Bornova', 'Ege', 'ok', 4400, NULL, NULL, 0, NULL, NULL);

INSERT INTO public.technicians (full_name, region, city, experience_years) VALUES
  ('Mehmet Yılmaz', 'Marmara', 'İstanbul', 5),
  ('Selin Kaya', 'İç Anadolu', 'Ankara', 3),
  ('Can Öztürk', 'Ege', 'İzmir', 7);

INSERT INTO public.work_orders (machine_id, code, alarm_code, complaint, status, badge, region, city, district, assigned_technician_id)
SELECT m.id, 'WO-4471', 'H-201', 'Hidrolik basınç düşüklüğü alarmı. Ana pompa ve basınç valfi kontrol edilecek.',
  'open', 'urgent', 'Marmara', 'İstanbul', 'Başakşehir',
  (SELECT id FROM public.technicians WHERE full_name='Mehmet Yılmaz')
FROM public.machines m WHERE m.name='BSF 36-4.16H Bom Pompası' AND m.district='Başakşehir';

INSERT INTO public.work_orders (machine_id, code, alarm_code, complaint, status, badge, region, city, district, assigned_technician_id)
SELECT m.id, 'WO-4467', 'P-105', 'Pompalama hattı tıkanması. S-valf ve aşınma plakası kontrol edilecek.',
  'open', 'active', 'İç Anadolu', 'Ankara', 'Çankaya',
  (SELECT id FROM public.technicians WHERE full_name='Selin Kaya')
FROM public.machines m WHERE m.name='BSA 1005 Sabit Pompa';

INSERT INTO public.work_orders (machine_id, code, alarm_code, complaint, status, badge, region, city, district, assigned_technician_id, closed_at, closing_notes)
SELECT m.id, 'WO-4463', NULL, 'Yağ filtresi değişimi',
  'closed', 'scheduled', 'Marmara', 'İstanbul', 'Başakşehir',
  (SELECT id FROM public.technicians WHERE full_name='Mehmet Yılmaz'),
  TIMESTAMPTZ '2026-04-10 00:00:00+00',
  '{"ariza":"Filtre tıkanması","neden":"Fark basıncı limit aştı","yapilan":"HF-0330 filtre değiştirildi","sure":"90"}'::jsonb
FROM public.machines m WHERE m.name='BSF 36-4.16H Bom Pompası' AND m.district='Başakşehir';

INSERT INTO public.work_orders (machine_id, code, alarm_code, complaint, status, badge, region, city, district, assigned_technician_id)
SELECT m.id, 'WO-4455', NULL, 'Periyodik bakım — 1500 saat yağ değişimi',
  'open', 'scheduled', 'İç Anadolu', 'Ankara', 'Keçiören',
  (SELECT id FROM public.technicians WHERE full_name='Selin Kaya')
FROM public.machines m WHERE m.name='BSF 32-4.14H Bom Pompası';

INSERT INTO public.work_orders (machine_id, code, alarm_code, complaint, status, badge, region, city, district, assigned_technician_id)
SELECT m.id, 'WO-4440', NULL, '2000 saatlik tam bakım planlandı',
  'open', 'scheduled', 'Marmara', 'İstanbul', 'Pendik',
  (SELECT id FROM public.technicians WHERE full_name='Mehmet Yılmaz')
FROM public.machines m WHERE m.name='BSA 2109H Sabit Pompa';

INSERT INTO public.work_order_parts (wo_id, part_name, part_no, probability, stock_count, stock_status)
SELECT id, 'Hidrolik pompa', 'HP-4420', 68, 3, 'ok' FROM public.work_orders WHERE code='WO-4471'
UNION ALL
SELECT id, 'Basınç regülasyon valfi', 'PV-1180', 18, 7, 'ok' FROM public.work_orders WHERE code='WO-4471'
UNION ALL
SELECT id, 'Hidrolik yağ filtresi', 'HF-0330', 10, 24, 'ok' FROM public.work_orders WHERE code='WO-4471'
UNION ALL
SELECT id, 'Hidrolik hortum seti', 'HS-0055', 4, 0, 'pending' FROM public.work_orders WHERE code='WO-4471';

INSERT INTO public.machine_service_history (machine_id, service_date, description, duration_hours, wo_id, technician_name)
SELECT m.id, DATE '2026-04-17', 'Hidrolik basınç arızası (devam)', NULL, (SELECT id FROM public.work_orders WHERE code='WO-4471'), 'Mehmet Yılmaz'
FROM public.machines m WHERE m.name='BSF 36-4.16H Bom Pompası' AND m.district='Başakşehir'
UNION ALL
SELECT m.id, DATE '2026-03-10', 'Yağ filtresi değişimi', 1.5, (SELECT id FROM public.work_orders WHERE code='WO-4463'), 'Mehmet Yılmaz'
FROM public.machines m WHERE m.name='BSF 36-4.16H Bom Pompası' AND m.district='Başakşehir'
UNION ALL
SELECT m.id, DATE '2026-01-18', 'Basınç valfi ayarı', 2, NULL, 'Mehmet Yılmaz'
FROM public.machines m WHERE m.name='BSF 36-4.16H Bom Pompası' AND m.district='Başakşehir'
UNION ALL
SELECT m.id, DATE '2025-11-04', 'Hidrolik pompa revizyonu', 4, NULL, 'Mehmet Yılmaz'
FROM public.machines m WHERE m.name='BSF 36-4.16H Bom Pompası' AND m.district='Başakşehir'
UNION ALL
SELECT m.id, DATE '2025-09-22', 'Rutin bakım', 1, NULL, 'Mehmet Yılmaz'
FROM public.machines m WHERE m.name='BSF 36-4.16H Bom Pompası' AND m.district='Başakşehir';

INSERT INTO public.master_profiles (name, region, city, experience_years, domain, work_md, persona_md, is_active) VALUES
('Kemal Yıldız', 'Marmara', 'İstanbul', 23, 'Hidrolik',
$md$# Teknik Uzmanlık Alanları
Makine: BSF/BSA serisi bom ve sabit pompalar
- H-201 alarmı: İlk adım her zaman filtre fark basıncı ölçümü. Limit: 0.8 bar.
- LOTO zorunlu: Basınç tahliyesi yapılmadan hiçbir müdahale.
- Saha verisi: 1500 saatte yağ değişimi (OEM 2000 dese de 198 vakadan %87 başarı).
- BSF 36-4.16H max çalışma basıncı: 340 bar, pik: 380 bar.
- Nominal debi: 180–220 L/dk.
- Yaz aylarında pompa contası ömrü %30 azalıyor (112 vaka). Soğutucu fan şart.$md$,
$md$# Kemal Yıldız — Davranış Profili
Konuşma tarzı: Kısa, net, otoriter. Gereksiz söz yok.
Başlangıç: 'Bak oğlum' veya 'Şunu dene önce'
Güvenlik: LOTO'yu atlayan teknisyene sert uyarı verir, yumuşamaz.
Belirsizlikte: Tahmin etmez, ölçüm ister. 'Fark basıncı kaç bar?'
Örnek cümle: 'Filtre fark basıncını ölç önce. 0.8 barın üzerindeyse filtre gitmiş.'$md$,
true),
('Ahmet Çelik', 'İç Anadolu', 'Ankara', 17, 'Elektrik & PLC',
$md$# Teknik Uzmanlık Alanları
- PLC arıza teşhisi, devre analizi, elektriksel izolasyon testleri
- P-105 alarmı: Önce S-valf kontrolü, sonra debi testi.
- BSA 1005 ana cıvatalar: M20 → 380 Nm, M24 → 650 Nm (3 aşamada: %30→%70→%100).$md$,
$md$# Ahmet Çelik — Davranış Profili
Konuşma tarzı: Sistematik, adım adım.
Başlangıç: 'Şöyle bir kontrol et'
PLC loglarına dayanır, sezgiyle değil veriyle karar verir.
Örnek cümle: 'Önce izolasyon testini yap, sonra konuşalım.'$md$,
true),
('Murat Demir', 'Ege', 'İzmir', 11, 'Mekanik & Bakım',
$md$# Teknik Uzmanlık Alanları
- BSF 42 serisi bom pompalar
- Periyodik bakım planlaması, rulman ve conta prosedürleri$md$,
$md$# Murat Demir — Davranış Profili
Konuşma tarzı: Samimi, destekleyici, özellikle yeni teknisyenlerle sabırlı.
Başlangıç: 'Merak etme, şöyle yapalım'$md$,
true);

INSERT INTO public.diagnosis_sessions (user_id, wo_id, machine_id, machine_name, title, status, turns)
SELECT NULL,
  (SELECT id FROM public.work_orders WHERE code='WO-4471'),
  (SELECT id FROM public.machines WHERE name='BSF 36-4.16H Bom Pompası' AND district='Başakşehir'),
  'BSF 36-4.16H', 'BSF 36 hidrolik basınç düşüklüğü', 'active',
  jsonb_build_array(
    jsonb_build_object('role','system','type','diagnosis','text','BSF 36 · H-201 hidrolik basınç düşüklüğü','ts', extract(epoch from now()-interval '2 hours')::numeric),
    jsonb_build_object('role','user','text','3. adımdaki debi testini yaptım, 198 L/dk geldi','ts', extract(epoch from now()-interval '90 minutes')::numeric),
    jsonb_build_object('role','ai','text','Nominal aralıkta (180–220 L/dk). Pompada büyük bir sorun yok. Şimdi 4. adıma, basınç regülasyon valfi ayarına geçebilirsin.','ts', extract(epoch from now()-interval '89 minutes')::numeric),
    jsonb_build_object('role','user','text','Yağ filtresini değiştirdim, fark basıncı 0,4 bar düştü','ts', extract(epoch from now()-interval '30 minutes')::numeric),
    jsonb_build_object('role','ai','text','Harika, limit altı. Sorunun ana sebebi filtre tıkanıklığıymış. Diğer adımları tamamlayabilirsin.','ts', extract(epoch from now()-interval '29 minutes')::numeric)
  );

INSERT INTO public.diagnosis_sessions (user_id, wo_id, machine_id, machine_name, title, status, turns)
SELECT NULL, NULL,
  (SELECT id FROM public.machines WHERE name='BSF 36-4.16H Bom Pompası' AND district='Başakşehir'),
  'BSF 36-4.16H', 'BSF 36 max çalışma basıncı nedir', 'active',
  jsonb_build_array(
    jsonb_build_object('role','user','text','BSF 36 max çalışma basıncı nedir','ts', extract(epoch from now()-interval '4 hours')::numeric),
    jsonb_build_object('role','ai','text','BSF 36-4.16H için maksimum çalışma basıncı 340 bar, pik basınç 380 bar. Nominal çalışma 280–320 bar aralığında tutulmalı.','ts', (extract(epoch from now()-interval '4 hours') + 8)::numeric)
  );

INSERT INTO public.diagnosis_sessions (user_id, wo_id, machine_id, machine_name, title, status, turns)
SELECT NULL, NULL,
  (SELECT id FROM public.machines WHERE name='BSA 1005 Sabit Pompa'),
  'BSA 1005', 'BSA 1005 tork değerleri', 'active',
  jsonb_build_array(
    jsonb_build_object('role','user','text','BSA 1005 ana cıvata tork değerleri','ts', extract(epoch from now()-interval '26 hours')::numeric),
    jsonb_build_object('role','ai','text','BSA 1005 ana cıvatalar için tork: M20 → 380 Nm, M24 → 650 Nm. Kılavuz s.214. Torklanırken 3 aşamada (%30 → %70 → %100) uygulanması önerilir.','ts', (extract(epoch from now()-interval '26 hours') + 12)::numeric)
  );

INSERT INTO public.diagnosis_sessions (user_id, wo_id, machine_id, machine_name, title, status, turns)
SELECT NULL,
  (SELECT id FROM public.work_orders WHERE code='WO-4463'),
  (SELECT id FROM public.machines WHERE name='BSF 36-4.16H Bom Pompası' AND district='Başakşehir'),
  'BSF 36-4.16H', 'Yağ filtresi değişim sıklığı', 'closed',
  jsonb_build_array(
    jsonb_build_object('role','user','text','Yağ filtresi değişim sıklığı','ts', extract(epoch from now()-interval '3 days')::numeric),
    jsonb_build_object('role','ai','text','OEM kılavuzu 2000 saatte yağ değişimi önerir. Saha verisi 1500 saati işaret ediyor (198 vakadan %87 başarı).','ts', (extract(epoch from now()-interval '3 days') + 10)::numeric)
  );
