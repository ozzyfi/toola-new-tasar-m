import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { generateWoCode, PRIORITY_LABEL, STATUS } from "@/lib/workOrders";
import { Mic, MicOff, Upload, Loader2, Wand2, X, Image as ImageIcon, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Machine = { id: string; name: string; model: string | null; city: string | null; district: string | null };

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type SpeechRecognitionType = any;

const NewWorkOrder = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [form, setForm] = useState({
    machine_id: "",
    complaint: "",
    description: "",
    city: "",
    district: "",
    badge: "orta",
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionType>(null);
  const speechAvailable =
    typeof window !== "undefined" &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("machines")
        .select("id, name, model, city, district")
        .order("name");
      setMachines((data ?? []) as Machine[]);
    })();
  }, []);

  useEffect(() => {
    const urls = photos.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [photos]);

  const update = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onPickMachine = (id: string) => {
    update("machine_id")(id);
    const m = machines.find((x) => x.id === id);
    if (m) {
      setForm((f) => ({ ...f, machine_id: id, city: m.city ?? f.city, district: m.district ?? f.district }));
    }
  };

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const next: File[] = [];
    for (const f of Array.from(files)) {
      if (!ACCEPTED_TYPES.includes(f.type)) {
        toast({ title: "Desteklenmeyen dosya", description: `${f.name} — sadece JPG/PNG/WebP/GIF.`, variant: "destructive" });
        continue;
      }
      if (f.size > MAX_FILE_SIZE) {
        toast({ title: "Dosya çok büyük", description: `${f.name} 10MB sınırını aşıyor.`, variant: "destructive" });
        continue;
      }
      next.push(f);
    }
    setPhotos((p) => [...p, ...next]);
  };

  const removePhoto = (i: number) => setPhotos((p) => p.filter((_, idx) => idx !== i));

  const startRecording = () => {
    if (!speechAvailable) {
      toast({ title: "Sesli giriş desteklenmiyor", description: "Tarayıcınız sesli kayıt desteklemiyor.", variant: "destructive" });
      return;
    }
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new Ctor();
    rec.lang = "tr-TR";
    rec.interimResults = true;
    rec.continuous = true;
    let finalText = "";
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript + " ";
        else interim += r[0].transcript;
      }
      setTranscript((finalText + interim).trim());
    };
    rec.onerror = (e: any) => {
      toast({ title: "Kayıt hatası", description: e.error || "Bilinmeyen hata", variant: "destructive" });
      setRecording(false);
    };
    rec.onend = () => setRecording(false);
    rec.start();
    recognitionRef.current = rec;
    setRecording(true);
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setRecording(false);
  };

  const callVoiceFunction = async () => {
    if (!transcript.trim()) {
      toast({ title: "Önce kayıt veya metin girin", variant: "destructive" });
      return;
    }
    setAiBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("voice_to_workorder", {
        body: { transcript: transcript.trim(), category: "ariza" },
      });
      if (error) throw error;
      if (data?.error && (!data.values || Object.keys(data.values).length === 0)) {
        toast({ title: "AI çıkaramadı", description: data.error, variant: "destructive" });
        return;
      }
      const v = data?.values ?? {};
      setForm((f) => ({
        ...f,
        complaint: v.ariza ? String(v.ariza) : f.complaint,
        description:
          [v.neden && `Olası neden: ${v.neden}`, v.yapilan && `Önerilen / yapılan: ${v.yapilan}`]
            .filter(Boolean)
            .join("\n") || f.description,
      }));
      toast({ title: "Form dolduruldu", description: "Lütfen kontrol edip kaydedin." });
    } catch (e: any) {
      toast({ title: "AI hatası", description: e.message ?? "Bilinmeyen hata", variant: "destructive" });
    } finally {
      setAiBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile?.region) {
      toast({ title: "Bölge bilgisi eksik", description: "Profilinizde bölge tanımlı olmalı.", variant: "destructive" });
      return;
    }
    if (!form.complaint.trim()) {
      toast({ title: "Arıza açıklaması gerekli", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const code = generateWoCode();
      const { data: wo, error } = await supabase
        .from("work_orders")
        .insert({
          code,
          complaint: form.complaint.trim(),
          description: form.description.trim() || null,
          status: STATUS.open,
          badge: form.badge,
          region: profile.region,
          city: form.city.trim() || null,
          district: form.district.trim() || null,
          client: profile.client ?? null,
          machine_id: form.machine_id || null,
          assigned_technician_id: user.id,
        })
        .select("id")
        .single();
      if (error) throw error;

      const uploadedPaths: string[] = [];
      for (const file of photos) {
        const path = `${wo.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: upErr } = await supabase.storage
          .from("evidence-photos")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) toast({ title: "Fotoğraf yüklenemedi", description: upErr.message, variant: "destructive" });
        else uploadedPaths.push(path);
      }
      if (uploadedPaths.length > 0) {
        await supabase.from("work_orders").update({ evidence_photo_urls: uploadedPaths }).eq("id", wo.id);
      }

      toast({ title: "İş emri oluşturuldu", description: code });
      navigate(`/app/work-orders/${wo.id}`, { replace: true });
    } catch (e: any) {
      toast({ title: "Kayıt başarısız", description: e.message ?? "Bilinmeyen hata", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Voice capture — premium dark card */}
      <section className="surface-ink p-6 sm:p-7">
        <div className="flex items-center gap-2 label-eyebrow text-ink-muted">
          <Sparkles className="w-3.5 h-3.5 text-primary" /> Sesli Giriş
        </div>
        <h2 className="font-display text-2xl font-bold mt-3 text-ink-foreground">
          Konuşun, ToolA <span className="text-primary">formu doldursun</span>
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Tek dokunuşla arızayı anlatın. Sahadan gelen ses kaydı yapılandırılmış bir iş emrine dönüşür.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {!recording ? (
            <button
              type="button"
              onClick={startRecording}
              disabled={!speechAvailable}
              className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 h-12 font-semibold disabled:opacity-50 hover:opacity-95 transition"
            >
              <Mic className="w-4 h-4" /> Kaydı başlat
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className="inline-flex items-center gap-2 rounded-full bg-destructive text-destructive-foreground px-5 h-12 font-semibold hover:opacity-95 transition"
            >
              <MicOff className="w-4 h-4" /> Durdur
              <span className="relative ml-1 flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive-foreground opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-destructive-foreground" /></span>
            </button>
          )}
          <button
            type="button"
            onClick={callVoiceFunction}
            disabled={aiBusy || !transcript.trim()}
            className="inline-flex items-center gap-2 rounded-full bg-ink-elevated text-ink-foreground border border-ink-border px-5 h-12 font-semibold disabled:opacity-40 hover:bg-ink-elevated/80 transition"
          >
            {aiBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            Form'a Aktar
          </button>
        </div>

        <Textarea
          placeholder={speechAvailable ? "Konuştuklarınız buraya yazılacak…" : "Tarayıcı sesli kaydı desteklemiyor. Buraya elle yazın."}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={4}
          className="mt-4 bg-ink-elevated text-ink-foreground placeholder:text-ink-muted border-ink-border rounded-2xl resize-none"
        />
      </section>

      {/* Form card */}
      <form onSubmit={submit} className="space-y-4">
        <section className="surface-card p-6 sm:p-7 space-y-5">
          <h2 className="font-display text-xl font-bold">İş emri bilgileri</h2>

          <Field label="Ekipman / Makine">
            <Select value={form.machine_id} onValueChange={onPickMachine}>
              <SelectTrigger className="h-12 rounded-2xl bg-secondary border-0">
                <SelectValue placeholder={machines.length ? "Ekipman seçin (opsiyonel)" : "Bölgenizde kayıtlı ekipman yok"} />
              </SelectTrigger>
              <SelectContent>
                {machines.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}{m.model ? ` — ${m.model}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Arıza açıklaması" required>
            <Input
              value={form.complaint}
              onChange={(e) => update("complaint")(e.target.value)}
              required
              className="h-12 rounded-2xl bg-secondary border-0"
              placeholder="Örn. Pompa P-204 yüksek ses ve titreşim"
            />
          </Field>

          <Field label="Belirti / detay">
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => update("description")(e.target.value)}
              className="rounded-2xl bg-secondary border-0 resize-none"
              placeholder="Gözlemler, kontrol edilenler, ölçümler…"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Şehir">
              <Input value={form.city} onChange={(e) => update("city")(e.target.value)} className="h-12 rounded-2xl bg-secondary border-0" />
            </Field>
            <Field label="İlçe">
              <Input value={form.district} onChange={(e) => update("district")(e.target.value)} className="h-12 rounded-2xl bg-secondary border-0" />
            </Field>
            <Field label="Öncelik">
              <Select value={form.badge} onValueChange={update("badge")}>
                <SelectTrigger className="h-12 rounded-2xl bg-secondary border-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* Photo dropzone */}
          <Field label="Fotoğraf / kanıt">
            <label
              htmlFor="photos"
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-secondary/50 hover:bg-secondary transition cursor-pointer p-8 text-center"
            >
              <div className="icon-tile w-12 h-12"><Upload className="w-5 h-5" /></div>
              <div className="text-sm font-semibold">Tıklayın veya sürükleyip bırakın</div>
              <div className="text-xs text-muted-foreground">JPG · PNG · WebP · max 10MB</div>
              <Input
                id="photos"
                type="file"
                multiple
                accept={ACCEPTED_TYPES.join(",")}
                onChange={(e) => onFiles(e.target.files)}
                className="hidden"
              />
            </label>

            {previews.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
                {previews.map((src, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-border group">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 w-7 h-7 rounded-full bg-ink text-ink-foreground flex items-center justify-center opacity-90 hover:opacity-100"
                      aria-label="Kaldır"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Field>
        </section>

        <div className="flex gap-2 justify-end sticky bottom-24 lg:bottom-4 z-10">
          <Button type="button" variant="outline" onClick={() => navigate(-1)} className="rounded-full h-12 px-6">
            İptal
          </Button>
          <Button type="submit" disabled={submitting} className="rounded-full h-12 px-6">
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Kaydet
          </Button>
        </div>
      </form>
    </div>
  );
};

const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <div className="space-y-2">
    <Label className="text-sm font-semibold">
      {label}{required && <span className="text-primary"> *</span>}
    </Label>
    {children}
  </div>
);

export default NewWorkOrder;
