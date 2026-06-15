
# Eksik Bölümlerin Frontend'e Bağlanması (MVP)

## Mevcut durum

Backend'de var olan ancak arayüzde hiç görünmeyen bölümler:

| Alan | Backend kaynağı | Frontend'de var mı? |
|---|---|---|
| Sahanın Hafızası | `learning_cases` tablosu | ❌ |
| AI Teşhis Geçmişi | `diagnosis_sessions` tablosu | ❌ (sadece anlık çağrı) |
| AI Düzeltmeleri | `corrections`, `correction_rules` | ❌ |
| Video → SOP | `repair_videos` + `repair-videos` bucket + `video_to_sop` fn | ❌ |
| Log Analizi | `machine_logs` + `machine-logs` bucket + `log_analyzer` fn | ❌ |
| PoW Raporu | `pow-reports` bucket + `generate_pow_report` fn | ❌ |
| Ekipman zaman tüneli | `machine_service_history`, `work_order_parts` | ❌ |
| Usta Profilleri | `master_profiles` | ❌ |
| Kullanıcı & rol yönetimi | `user_roles`, `profiles` | ❌ |

Şu an menüde sadece: Görevler, Yeni, Panel, Ekipman, Ekip var.

## Hedef

Yalnızca frontend dokunarak yukarıdaki 9 bölümü MVP seviyesinde göstermek. Veritabanı şeması, RLS, edge function imzaları, tasarım sistemi **değişmeyecek**.

## Yapılacak işler

### 1. Navigasyon iskeleti
- `AppLayout` menüsüne yeni girişler: **Hafıza**, **Teşhis**, **SOP**, **Loglar**.
- Yönetici menüsüne ek: **Raporlar**, **Ustalar**, **Kullanıcılar** (sadece admin/supervisor görür; admin için `requireManager` + role kontrolü).
- Mobil alt-bar 5 ikona sınırlı kalacak; geri kalanı üst-sağ "Daha fazla" menüsünden açılır.

### 2. Yeni sayfalar (`src/pages/app/*`)
Her sayfa: liste + arama/filtre + (varsa) detay paneli, mevcut tasarım dilinde (ink kart, peach pill, vs.).

| Route | Bileşen | Veri |
|---|---|---|
| `/app/memory` | `Memory.tsx` | `learning_cases` SELECT (RLS region-scoped); arama, etiket filtresi, detay drawer |
| `/app/diagnosis` | `DiagnosisHistory.tsx` | `diagnosis_sessions` listesi; detayda "Düzeltme ekle" → `corrections` INSERT + `correction_rules` opsiyonel |
| `/app/sop` | `RepairVideos.tsx` | `repair-videos` bucket upload + `repair_videos` INSERT, `video_to_sop` çağrısı, SOP adımlarını listele |
| `/app/logs` | `MachineLogs.tsx` | `machine-logs` bucket upload + `machine_logs` INSERT, `log_analyzer` çağrısı, findings/recommendations görünümü |
| `/app/manager/reports` | `PowReports.tsx` | Kapanmış WO listesi + "Rapor üret" → `generate_pow_report`, `pow-reports` bucket'tan signed URL ile indirme |
| `/app/manager/masters` | `MasterProfiles.tsx` | `master_profiles` SELECT, uzmanlık alanı/katkı görünümü |
| `/app/manager/users` | `Users.tsx` (admin only) | `profiles` + `user_roles` listesi, rol değiştir (admin RLS'ye tabi; yoksa "yetki yok" uyarısı) |
| `/app/machines/:id` | `MachineDetail.tsx` | Var olan `Machines.tsx`'e bağlanır; `machine_service_history` + `work_order_parts` zaman tüneli |

### 3. `WorkOrderDetail` küçük genişlemeler (mevcut akışı bozmadan)
- "Kullanılan parçalar" bölümü: `work_order_parts` SELECT + satır ekleme.
- "AI cevabını düzelt" butonu: `diagnosis_sessions` üzerinden `corrections` INSERT.
- "PoW raporu" butonu (kapalı WO'larda): `generate_pow_report` çağrısı + indirme linki.

### 4. Erişim kuralları
- Tüm yeni sayfalar `ProtectedRoute` arkasında.
- Yönetici-only sayfalar `requireManager`.
- Admin-only "Kullanıcılar" sayfası ek role kontrolü ile gizlenir.
- RLS hata verirse kullanıcıya tasarım sistemine uygun "Bu bölgeye erişim yok" boş-durum kartı.

### 5. Paylaşılan parçalar
- `src/lib/storage.ts`: signed-URL helper (`pow-reports`, `repair-videos`, `machine-logs`).
- `src/lib/edgeFunctions.ts`: 5 edge function için tip-güvenli sarmalayıcılar.
- `src/components/EmptyState.tsx`, `UploadDropzone.tsx`, `SectionHeader.tsx` yeniden kullanım için.

## Kapsam dışı (sonraki sürüm)

- Gerçek zamanlı bildirim/subscriptions.
- Edge function'larda şema değişikliği veya yeni endpoint.
- Tasarım sisteminde yeni token.
- Public landing page'e dokunulması.
- Admin için kullanıcı davet/silme akışı (sadece rol değiştirme).

## Riskler & Notlar

- **RLS region izolasyonu**: Yeni listelerin tamamı `region` filtresine takılı; profil region'ı boşsa boş ekran görünebilir. UI'da "Profil bölgenizi ayarlayın" yönlendirmesi.
- **`user_roles` UPDATE politikası**: Eğer RLS sadece self-select izin veriyorsa "Kullanıcılar" sayfası read-only kalır; yazma hatasında kullanıcıya net mesaj.
- **`pow-reports` ve `repair-videos` private bucket**: Signed URL ile sunulacak (kısa ömürlü).
- **Mobil alt-bar şişmesin**: 5 üstündeki sekmeler "Daha fazla" menüsünde toplanır.

## Teslimat sırası (tek PR)

1. Navigasyon + iskelet route'lar + boş ekranlar.
2. `Memory`, `DiagnosisHistory`, `MachineDetail` (saf okuma).
3. `RepairVideos`, `MachineLogs` (upload + edge function).
4. `PowReports`, `MasterProfiles`, `Users` (yönetici).
5. `WorkOrderDetail` küçük genişlemeler.
