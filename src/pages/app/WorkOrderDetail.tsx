import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  ClosingNotes,
  STATUS,
  STATUS_LABEL,
  STATUS_DOT,
  PRIORITY_LABEL,
  PRIORITY_DOT,
  hasEvidence,
  isQualityClosure,
} from "@/lib/workOrders";
import {
  ArrowLeft,
  Bot,
  Loader2,
  Upload,
  AlertTriangle,
  Save,
  BookOpen,
  Wrench,
  MapPin,
  Calendar,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

type WO = {
  id: string;
  code: string;
  complaint: string | null;
  description: string | null;
  status: string | null;
  badge: string | null;
  region: string | null;
  city: string | null;
  district: string | null;
  client: string | null;
  assigned_technician_id: string | null;
  machine_id: string | null;
  evidence_photo_urls: any;
  closing_notes: any;
  closed_at: string | null;
  created_at: string;
  machines?: { id: string; name: string; model: string | null; serial_no: string | null } | null;
};

type DiagnoseResult = {
  type: string;
  safety?: string;
  text?: string;
  steps?: Array<{ num: number; text: string; source_ref: string; confidence: number }>;
  top_cause?: string;
  alternatives?: string[];
  recommended_parts?: Array<{ name: string; part_no: string; stock: string; delivery: string }>;
  usta?: { ad: string; bolge: string; deneyim: string };
  error?: string;
};

const WorkOrderDetail = () => {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const [wo, setWo] = useState<WO | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoUrls, setPhotoUrls] = useState<Array<{ path: string; url: string }>>([]);
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnosis, setDiagnosis] = useState<DiagnoseResult | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [notes, setNotes] = useState<ClosingNotes>({});
  const [status, setStatus] = useState<string>(STATUS.open);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("work_orders")
      .select("*, machines(id, name, model, serial_no)")
      .eq("id", id)
      .maybeSingle();
    if (error) toast({ title: "Yüklenemedi", description: error.message, variant: "destructive" });
    const woData = data as WO | null;
    setWo(woData);
    if (woData) {
      setStatus(woData.status ?? STATUS.open);
      setNotes((woData.closing_notes ?? {}) as ClosingNotes);
      const paths: string[] = Array.isArray(woData.evidence_photo_urls) ? woData.evidence_photo_urls : [];
      if (paths.length) {
        const { data: signed } = await supabase.storage
          .from("evidence-photos")
          .createSignedUrls(paths, 3600);
        setPhotoUrls((signed ?? []).map((s, i) => ({ path: paths[i], url: s.signedUrl ?? "" })).filter((x) => x.url));
      } else {
        setPhotoUrls([]);
      }
      if (woData.machine_id) {
        const { data: lc } = await supabase
          .from("learning_cases")
          .select("id, alarm, diagnosis, success, created_at")
          .eq("machine_id", woData.machine_id)
          .order("created_at", { ascending: false })
          .limit(5);
        setHistory(lc ?? []);
      }
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const runDiagnose = async () => {
    if (!wo || !profile?.region) return;
    setDiagnosing(true);
    setDiagnosis(null);
    try {
      const question = [wo.complaint, wo.description].filter(Boolean).join("\n");
      const { data, error } = await supabase.functions.invoke("diagnose", {
        body: { question, region: profile.region, mode: "diagnosis", wo_id: wo.id, history: [], corrections: [] },
      });
      if (error) throw error;
      setDiagnosis(data as DiagnoseResult);
      if ((data as any)?.error) {
        toast({ title: "AI uyarı", description: (data as any).text ?? (data as any).error, variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Tanı alınamadı", description: e.message ?? "Bilinmeyen hata", variant: "destructive" });
    } finally {
      setDiagnosing(false);
    }
  };

  const saveDiagnosis = async () => {
    if (!wo || !diagnosis || !user) return;
    const { error } = await supabase.from("diagnosis_sessions").insert({
      user_id: user.id,
      wo_id: wo.id,
      machine_id: wo.machine_id,
      machine_name: wo.machines?.name ?? null,
      title: wo.complaint?.slice(0, 80) ?? "Tanı",
      status: "completed",
      turns: [{ role: "assistant", content: diagnosis }] as any,
    });
    if (error) { toast({ title: "Kaydedilemedi", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Tanı iş emrine kaydedildi" });
  };

  const onPhotoUpload = async (files: FileList | null) => {
    if (!files || !wo) return;
    setUploading(true);
    const existing: string[] = Array.isArray(wo.evidence_photo_urls) ? wo.evidence_photo_urls : [];
    const next: string[] = [...existing];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) { toast({ title: "Desteklenmeyen dosya", description: f.name, variant: "destructive" }); continue; }
      if (f.size > 10 * 1024 * 1024) { toast({ title: "Dosya çok büyük", description: f.name, variant: "destructive" }); continue; }
      const path = `${wo.id}/${Date.now()}_${f.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage.from("evidence-photos").upload(path, f, { contentType: f.type });
      if (error) toast({ title: "Yüklenemedi", description: error.message, variant: "destructive" });
      else next.push(path);
    }
    const { error: upErr } = await supabase.from("work_orders").update({ evidence_photo_urls: next }).eq("id", wo.id);
    if (upErr) toast({ title: "Kayıt güncellenemedi", description: upErr.message, variant: "destructive" });
    setUploading(false);
    await load();
  };

  const saveIntervention = async () => {
    if (!wo) return;
    setSaving(true);
    const isClosing = status === STATUS.closed;
    const quality = isQualityClosure({ status: STATUS.closed, closing_notes: notes, evidence_photo_urls: wo.evidence_photo_urls });
    if (isClosing && !quality && !notes.incomplete_reason) {
      toast({ title: "Eksik kapanış", description: "Kök neden, yapılan işlem ve fotoğraf kanıtı eksik. 'Eksik kapanış nedeni' alanını doldurun.", variant: "destructive" });
      setSaving(false);
      return;
    }
    const updates: any = { status, closing_notes: notes };
    if (isClosing && !wo.closed_at) updates.closed_at = new Date().toISOString();
    if (!isClosing) updates.closed_at = null;
    const { error } = await supabase.from("work_orders").update(updates).eq("id", wo.id);
    if (error) { toast({ title: "Kaydedilemedi", description: error.message, variant: "destructive" }); setSaving(false); return; }

    if (isClosing && quality && user) {
      const { error: lcErr } = await supabase.from("learning_cases").insert({
        alarm: wo.complaint ?? null,
        diagnosis: [notes.root_cause, notes.action_taken].filter(Boolean).join(" — "),
        success: true,
        usta: profile?.full_name ?? null,
        bolge: wo.region ?? profile?.region ?? null,
        month: new Date().toISOString().slice(0, 7),
        machine_id: wo.machine_id,
        wo_id: wo.id,
        created_by: user.id,
        discovered_by_name: profile?.full_name ?? null,
      });
      if (lcErr) console.warn("learning_case insert failed", lcErr);
    }

    toast({ title: "Kaydedildi" });
    setSaving(false);
    load();
  };

  if (loading) return <p className="text-muted-foreground text-sm">Yükleniyor…</p>;
  if (!wo) return (
    <div className="space-y-4">
      <p>İş emri bulunamadı.</p>
      <Button asChild variant="outline" className="rounded-full"><Link to="/app/work-orders"><ArrowLeft className="w-4 h-4 mr-2" />Listeye dön</Link></Button>
    </div>
  );

  const priority = wo.badge ?? "orta";
  const sCode = wo.status ?? STATUS.open;
  const quality = isQualityClosure(wo);

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Back row */}
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="rounded-full -ml-2">
          <Link to="/app/work-orders"><ArrowLeft className="w-4 h-4 mr-2" />İş emirleri</Link>
        </Button>
      </div>

      {/* Header card */}
      <section className="surface-card p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground font-mono">{wo.code}</div>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
              {wo.machines?.name ?? wo.complaint ?? "İş emri"}
            </h1>
            {wo.machines?.name && wo.complaint && (
              <p className="mt-2 text-foreground/80">{wo.complaint}</p>
            )}
          </div>
          <div className="icon-tile w-14 h-14 shrink-0"><Wrench className="w-6 h-6" /></div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="pill bg-secondary text-foreground/80 border border-border">
            <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_DOT[sCode])} />
            {STATUS_LABEL[sCode] ?? sCode}
          </span>
          <span className="pill bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
            <span className={cn("w-1.5 h-1.5 rounded-full", PRIORITY_DOT[priority])} />
            {PRIORITY_LABEL[priority] ?? priority}
          </span>
          {quality && (
            <span className="pill bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border border-[hsl(var(--success))]/20">
              <ShieldCheck className="w-3 h-3" /> Kanıtlı kapanış
            </span>
          )}
        </div>

        {wo.description && (
          <p className="mt-4 text-sm text-foreground/80 whitespace-pre-line">{wo.description}</p>
        )}

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <MetaCell icon={<Wrench className="w-3.5 h-3.5" />} label="Ekipman" value={wo.machines?.name ?? "—"} sub={wo.machines?.model ?? undefined} />
          <MetaCell icon={<MapPin className="w-3.5 h-3.5" />} label="Lokasyon" value={[wo.district, wo.city].filter(Boolean).join(", ") || "—"} sub={wo.region ?? undefined} />
          <MetaCell icon={<Calendar className="w-3.5 h-3.5" />} label="Açılış" value={new Date(wo.created_at).toLocaleDateString("tr-TR")} sub={new Date(wo.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })} />
          <MetaCell icon={<ShieldCheck className="w-3.5 h-3.5" />} label="Kanıt" value={hasEvidence(wo) ? `${photoUrls.length} foto` : "Yok"} />
        </div>
      </section>

      {/* Evidence */}
      <section className="surface-card p-6 sm:p-7 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Kanıtlar</h2>
          <label htmlFor="addphoto" className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 h-10 text-sm font-semibold cursor-pointer hover:bg-muted">
            <Upload className="w-4 h-4" /> Ekle
            <input id="addphoto" type="file" accept="image/*" multiple onChange={(e) => onPhotoUpload(e.target.files)} disabled={uploading} className="hidden" />
          </label>
        </div>
        {photoUrls.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center border-2 border-dashed border-border rounded-2xl">Henüz fotoğraf yok.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photoUrls.map((p) => (
              <a key={p.path} href={p.url} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden rounded-2xl border border-border group">
                <img src={p.url} alt="kanıt" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              </a>
            ))}
          </div>
        )}
      </section>

      {/* AI diagnosis — dark premium */}
      <section className="surface-ink p-6 sm:p-7 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 label-eyebrow text-ink-muted">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> ToolA Tanı Desteği
            </div>
            <h2 className="font-display text-xl font-bold mt-2 text-ink-foreground">
              Kaynak referanslı <span className="text-primary">öneriler</span>
            </h2>
          </div>
          <button
            onClick={runDiagnose}
            disabled={diagnosing}
            className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 h-11 font-semibold disabled:opacity-50 hover:opacity-95 transition"
          >
            {diagnosing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
            ToolA Önerisi Al
          </button>
        </div>

        {!diagnosis && !diagnosing && (
          <p className="text-sm text-ink-muted">Henüz tanı çağrılmadı. Saha gözlemine göre <strong>{"<60s"}</strong> içinde öneri alın.</p>
        )}

        {diagnosis && (
          <div className="space-y-3 text-sm text-ink-foreground">
            {diagnosis.safety && (
              <div className="rounded-2xl bg-warning/15 border border-[hsl(var(--warning))]/30 p-3 text-[hsl(36_95%_85%)]">
                <strong>Güvenlik:</strong> {diagnosis.safety}
              </div>
            )}
            {diagnosis.text && <p className="whitespace-pre-line text-ink-foreground/90">{diagnosis.text}</p>}
            {diagnosis.top_cause && (
              <div className="rounded-2xl bg-ink-elevated border border-ink-border p-4">
                <div className="label-eyebrow text-ink-muted">Olası kök neden</div>
                <div className="mt-1 font-semibold">{diagnosis.top_cause}</div>
              </div>
            )}
            {diagnosis.steps && diagnosis.steps.length > 0 && (
              <div>
                <div className="font-semibold mb-2">Önerilen kontroller</div>
                <ol className="space-y-2">
                  {diagnosis.steps.map((s) => (
                    <li key={s.num} className="flex gap-3 rounded-2xl bg-ink-elevated border border-ink-border p-3">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">{s.num}</span>
                      <div className="min-w-0">
                        <div>{s.text}</div>
                        <div className="text-xs text-ink-muted mt-1">
                          {s.source_ref && <>kaynak: {s.source_ref} · </>}
                          {typeof s.confidence === "number" && <>güven %{s.confidence}</>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {diagnosis.alternatives && diagnosis.alternatives.length > 0 && (
              <div>
                <div className="font-semibold mb-1">Alternatif olasılıklar</div>
                <ul className="list-disc pl-5 text-ink-foreground/80">
                  {diagnosis.alternatives.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            )}
            <button
              onClick={saveDiagnosis}
              className="inline-flex items-center gap-2 rounded-full bg-ink-elevated text-ink-foreground border border-ink-border px-4 h-10 text-sm font-semibold hover:bg-ink-elevated/80"
            >
              <Save className="w-4 h-4" /> Tanıyı kaydet
            </button>
          </div>
        )}
      </section>

      {/* History */}
      {history.length > 0 && (
        <section className="surface-card p-6 sm:p-7 space-y-3">
          <h2 className="font-display text-lg font-bold flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" />Benzer geçmiş vakalar</h2>
          <ul className="space-y-3">
            {history.map((h) => (
              <li key={h.id} className="rounded-2xl border border-border p-3">
                <div className="text-xs text-muted-foreground">
                  {new Date(h.created_at).toLocaleDateString("tr-TR")}
                  {h.success === false && <span className="text-destructive"> · başarısız</span>}
                </div>
                <div className="font-semibold mt-0.5">{h.alarm || "—"}</div>
                {h.diagnosis && <div className="text-sm text-muted-foreground mt-0.5">{h.diagnosis}</div>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Intervention / closure */}
      <section className="surface-card p-6 sm:p-7 space-y-5">
        <h2 className="font-display text-lg font-bold">Müdahale & Kapanış</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NoteField label="Teknisyen gözlemi" full>
            <Textarea rows={2} value={notes.observation ?? ""} onChange={(e) => setNotes({ ...notes, observation: e.target.value })} className="rounded-2xl bg-secondary border-0 resize-none" />
          </NoteField>
          <NoteField label="Kök neden" full>
            <Textarea rows={2} value={notes.root_cause ?? ""} onChange={(e) => setNotes({ ...notes, root_cause: e.target.value })} className="rounded-2xl bg-secondary border-0 resize-none" />
          </NoteField>
          <NoteField label="Yapılan işlem" full>
            <Textarea rows={2} value={notes.action_taken ?? ""} onChange={(e) => setNotes({ ...notes, action_taken: e.target.value })} className="rounded-2xl bg-secondary border-0 resize-none" />
          </NoteField>
          <NoteField label="Kullanılan parçalar">
            <Input value={notes.parts_used ?? ""} onChange={(e) => setNotes({ ...notes, parts_used: e.target.value })} className="h-12 rounded-2xl bg-secondary border-0" />
          </NoteField>
          <NoteField label="Ölçüm / sonuç">
            <Input value={notes.measurement ?? ""} onChange={(e) => setNotes({ ...notes, measurement: e.target.value })} className="h-12 rounded-2xl bg-secondary border-0" />
          </NoteField>
          <div className="sm:col-span-2 flex items-center gap-3 rounded-2xl bg-secondary px-4 py-3">
            <Switch checked={!!notes.follow_up_required} onCheckedChange={(v) => setNotes({ ...notes, follow_up_required: v })} />
            <Label className="!mt-0 text-sm">Takip işlemi gerekli</Label>
          </div>
          <NoteField label="Kapanış notu" full>
            <Textarea rows={2} value={notes.closure_note ?? ""} onChange={(e) => setNotes({ ...notes, closure_note: e.target.value })} className="rounded-2xl bg-secondary border-0 resize-none" />
          </NoteField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
          <NoteField label="Durum">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-12 rounded-2xl bg-secondary border-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </NoteField>
          <Button onClick={saveIntervention} disabled={saving} className="rounded-full h-12 px-6">
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Kaydet
          </Button>
        </div>

        {status === STATUS.closed && !quality && (
          <Alert variant="destructive" className="rounded-2xl">
            <AlertTriangle className="w-4 h-4" />
            <AlertTitle>Eksik kapanış</AlertTitle>
            <AlertDescription className="space-y-2">
              Kök neden, yapılan işlem ve fotoğraf kanıtının üçü de gerekli. Eksik kapatma için bir gerekçe belirtin:
              <Textarea
                className="mt-2 rounded-2xl resize-none"
                rows={2}
                placeholder="Eksik kapanış gerekçesi"
                value={notes.incomplete_reason ?? ""}
                onChange={(e) => setNotes({ ...notes, incomplete_reason: e.target.value })}
              />
            </AlertDescription>
          </Alert>
        )}
        {sCode === STATUS.closed && quality && (
          <Alert className="rounded-2xl border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]">
            <BookOpen className="w-4 h-4" />
            <AlertTitle>Operasyonel hafızaya alındı</AlertTitle>
            <AlertDescription>
              Bu kapanış kanıt-tabanlı ve eksiksiz. Benzer arızalar için tekrar kullanılabilir.
            </AlertDescription>
          </Alert>
        )}
      </section>
    </div>
  );
};

const MetaCell = ({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) => (
  <div className="rounded-2xl bg-secondary p-3">
    <div className="flex items-center gap-1.5 label-eyebrow">{icon}{label}</div>
    <div className="mt-1 font-semibold text-sm truncate">{value}</div>
    {sub && <div className="text-xs text-muted-foreground truncate">{sub}</div>}
  </div>
);

const NoteField = ({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) => (
  <div className={cn("space-y-2", full && "sm:col-span-2")}>
    <Label className="text-sm font-semibold">{label}</Label>
    {children}
  </div>
);

export default WorkOrderDetail;
