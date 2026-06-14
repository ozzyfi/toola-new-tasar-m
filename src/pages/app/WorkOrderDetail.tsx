import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  STATUS_TONE,
  PRIORITY_LABEL,
  PRIORITY_TONE,
  hasEvidence,
  isQualityClosure,
} from "@/lib/workOrders";
import { ArrowLeft, Bot, Loader2, Upload, AlertTriangle, Save, BookOpen } from "lucide-react";

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
        setPhotoUrls(
          (signed ?? []).map((s, i) => ({ path: paths[i], url: s.signedUrl ?? "" })).filter((x) => x.url),
        );
      } else {
        setPhotoUrls([]);
      }

      // Similar past learning cases (same machine)
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
        body: {
          question,
          region: profile.region,
          mode: "diagnosis",
          wo_id: wo.id,
          history: [],
          corrections: [],
        },
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
    if (error) {
      toast({ title: "Kaydedilemedi", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Tanı iş emrine kaydedildi" });
  };

  const onPhotoUpload = async (files: FileList | null) => {
    if (!files || !wo) return;
    setUploading(true);
    const existing: string[] = Array.isArray(wo.evidence_photo_urls) ? wo.evidence_photo_urls : [];
    const next: string[] = [...existing];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) {
        toast({ title: "Desteklenmeyen dosya", description: f.name, variant: "destructive" });
        continue;
      }
      if (f.size > 10 * 1024 * 1024) {
        toast({ title: "Dosya çok büyük", description: f.name, variant: "destructive" });
        continue;
      }
      const path = `${wo.id}/${Date.now()}_${f.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage.from("evidence-photos").upload(path, f, { contentType: f.type });
      if (error) {
        toast({ title: "Yüklenemedi", description: error.message, variant: "destructive" });
      } else {
        next.push(path);
      }
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
      toast({
        title: "Eksik kapanış",
        description: "Kök neden, yapılan işlem ve fotoğraf kanıtı eksik. Lütfen 'Eksik kapanış nedeni' alanını doldurun.",
        variant: "destructive",
      });
      setSaving(false);
      return;
    }
    const updates: any = {
      status,
      closing_notes: notes,
    };
    if (isClosing && !wo.closed_at) updates.closed_at = new Date().toISOString();
    if (!isClosing) updates.closed_at = null;
    const { error } = await supabase.from("work_orders").update(updates).eq("id", wo.id);
    if (error) {
      toast({ title: "Kaydedilemedi", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    // If closing as quality, write a learning case (reusable operational memory)
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

  if (loading) return <p className="text-muted-foreground text-sm">Yükleniyor...</p>;
  if (!wo)
    return (
      <div className="space-y-4">
        <p>İş emri bulunamadı.</p>
        <Button asChild variant="outline"><Link to="/app/work-orders"><ArrowLeft className="w-4 h-4 mr-2" />Listeye dön</Link></Button>
      </div>
    );

  const priority = wo.badge ?? "orta";
  const sCode = wo.status ?? STATUS.open;
  const quality = isQualityClosure(wo);

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/app/work-orders"><ArrowLeft className="w-4 h-4 mr-2" />İş emirleri</Link>
        </Button>
        <div className="flex gap-2">
          <Badge variant="outline" className={STATUS_TONE[sCode] ?? ""}>{STATUS_LABEL[sCode] ?? sCode}</Badge>
          <Badge variant="outline" className={PRIORITY_TONE[priority] ?? ""}>{PRIORITY_LABEL[priority] ?? priority}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="text-xs text-muted-foreground">{wo.code}</div>
          <CardTitle className="text-xl">{wo.complaint || "(Açıklama yok)"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {wo.description && <p className="whitespace-pre-line">{wo.description}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
            <div><span className="text-foreground">Ekipman:</span> {wo.machines?.name ?? "—"}{wo.machines?.model ? ` (${wo.machines.model})` : ""}</div>
            <div><span className="text-foreground">Lokasyon:</span> {[wo.district, wo.city].filter(Boolean).join(", ") || "—"}</div>
            <div><span className="text-foreground">Bölge:</span> {wo.region ?? "—"}</div>
            <div><span className="text-foreground">Tarih:</span> {new Date(wo.created_at).toLocaleString("tr-TR")}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Kanıtlar</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {photoUrls.length === 0 ? (
            <p className="text-sm text-muted-foreground">Henüz fotoğraf yok.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {photoUrls.map((p) => (
                <a key={p.path} href={p.url} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden rounded border">
                  <img src={p.url} alt="kanıt" className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="addphoto" className="flex items-center gap-2"><Upload className="w-4 h-4" />Fotoğraf ekle</Label>
            <Input id="addphoto" type="file" accept="image/*" multiple onChange={(e) => onPhotoUpload(e.target.files)} disabled={uploading} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg flex items-center gap-2"><Bot className="w-4 h-4" />ToolA Tanı Desteği</CardTitle>
          <Button onClick={runDiagnose} disabled={diagnosing}>
            {diagnosing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bot className="w-4 h-4 mr-2" />}
            ToolA Önerisi Al
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {!diagnosis && !diagnosing && (
            <p className="text-sm text-muted-foreground">Henüz tanı çağrılmadı.</p>
          )}
          {diagnosis && (
            <div className="space-y-3 text-sm">
              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertTitle>Karar desteği</AlertTitle>
                <AlertDescription>
                  Bu çıktı bir öneridir. Sahada uygulamadan önce teknisyen tarafından doğrulanmalıdır.
                </AlertDescription>
              </Alert>
              {diagnosis.safety && (
                <div className="rounded border border-amber-200 bg-amber-50 p-3 text-amber-900 text-sm">
                  <strong>Güvenlik:</strong> {diagnosis.safety}
                </div>
              )}
              {diagnosis.text && <p className="whitespace-pre-line">{diagnosis.text}</p>}
              {diagnosis.top_cause && (
                <div><strong>Olası kök neden:</strong> {diagnosis.top_cause}</div>
              )}
              {diagnosis.steps && diagnosis.steps.length > 0 && (
                <div>
                  <div className="font-medium mb-1">Önerilen kontroller</div>
                  <ol className="space-y-1 list-decimal pl-5">
                    {diagnosis.steps.map((s) => (
                      <li key={s.num}>
                        {s.text}{" "}
                        {s.source_ref && <span className="text-xs text-muted-foreground">— kaynak: {s.source_ref}</span>}
                        {typeof s.confidence === "number" && (
                          <span className="text-xs text-muted-foreground"> · güven %{s.confidence}</span>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {diagnosis.alternatives && diagnosis.alternatives.length > 0 && (
                <div>
                  <div className="font-medium mb-1">Alternatif olasılıklar</div>
                  <ul className="list-disc pl-5">
                    {diagnosis.alternatives.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={saveDiagnosis}>
                <Save className="w-4 h-4 mr-2" />Tanıyı kaydet
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><BookOpen className="w-4 h-4" />Benzer geçmiş vakalar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {history.map((h) => (
              <div key={h.id} className="border-l-2 pl-3">
                <div className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleDateString("tr-TR")}{h.success === false && " · başarısız"}</div>
                <div className="font-medium">{h.alarm || "—"}</div>
                {h.diagnosis && <div className="text-muted-foreground">{h.diagnosis}</div>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Müdahale & Kapanış</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2 sm:col-span-2">
              <Label>Teknisyen gözlemi</Label>
              <Textarea rows={2} value={notes.observation ?? ""} onChange={(e) => setNotes({ ...notes, observation: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Kök neden</Label>
              <Textarea rows={2} value={notes.root_cause ?? ""} onChange={(e) => setNotes({ ...notes, root_cause: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Yapılan işlem</Label>
              <Textarea rows={2} value={notes.action_taken ?? ""} onChange={(e) => setNotes({ ...notes, action_taken: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Kullanılan parçalar</Label>
              <Input value={notes.parts_used ?? ""} onChange={(e) => setNotes({ ...notes, parts_used: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Ölçüm / sonuç</Label>
              <Input value={notes.measurement ?? ""} onChange={(e) => setNotes({ ...notes, measurement: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2 flex items-center gap-3">
              <Switch checked={!!notes.follow_up_required} onCheckedChange={(v) => setNotes({ ...notes, follow_up_required: v })} />
              <Label className="!mt-0">Takip işlemi gerekli</Label>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Kapanış notu</Label>
              <Textarea rows={2} value={notes.closure_note ?? ""} onChange={(e) => setNotes({ ...notes, closure_note: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div className="space-y-2">
              <Label>Durum</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end">
              <Button onClick={saveIntervention} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Kaydet
              </Button>
            </div>
          </div>

          {status === STATUS.closed && !quality && (
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertTitle>Eksik kapanış</AlertTitle>
              <AlertDescription>
                Kök neden, yapılan işlem ve fotoğraf kanıtının üçü de gerekli. Eksik kapatma için bir gerekçe belirtin:
                <Textarea
                  className="mt-2"
                  rows={2}
                  placeholder="Eksik kapanış gerekçesi"
                  value={notes.incomplete_reason ?? ""}
                  onChange={(e) => setNotes({ ...notes, incomplete_reason: e.target.value })}
                />
              </AlertDescription>
            </Alert>
          )}
          {sCode === STATUS.closed && quality && (
            <Alert>
              <BookOpen className="w-4 h-4" />
              <AlertTitle>Operasyonel hafızaya alındı</AlertTitle>
              <AlertDescription>
                Bu kapanış kanıt-tabanlı ve eksiksiz. Sonuç benzer arızalar için tekrar kullanılabilir hâle getirildi.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkOrderDetail;
