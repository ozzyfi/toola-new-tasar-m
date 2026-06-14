import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { generateWoCode, PRIORITY_LABEL, STATUS } from "@/lib/workOrders";
import { Mic, MicOff, Upload, Loader2, Wand2 } from "lucide-react";

type Machine = { id: string; name: string; model: string | null; city: string | null; district: string | null };

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Browser SpeechRecognition typing
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
  const [submitting, setSubmitting] = useState(false);

  // Voice
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [transcribing, setTranscribing] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionType>(null);
  const speechAvailable =
    typeof window !== "undefined" &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("machines")
        .select("id, name, model, city, district")
        .order("name");
      setMachines((data ?? []) as Machine[]);
    };
    load();
  }, []);

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

  const startRecording = () => {
    if (!speechAvailable) {
      toast({
        title: "Sesli giriş desteklenmiyor",
        description: "Tarayıcınız sesli kayıt desteklemiyor. Lütfen metin olarak yazın.",
        variant: "destructive",
      });
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
      console.error("speech error", e);
      toast({ title: "Kayıt hatası", description: e.error || "Bilinmeyen hata", variant: "destructive" });
      setRecording(false);
    };
    rec.onend = () => setRecording(false);
    rec.start();
    recognitionRef.current = rec;
    setRecording(true);
    setTranscribing(true);
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setRecording(false);
    setTranscribing(false);
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
        description: [v.neden && `Olası neden: ${v.neden}`, v.yapilan && `Önerilen / yapılan: ${v.yapilan}`]
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
      const insertPayload: any = {
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
      };
      const { data: wo, error } = await supabase
        .from("work_orders")
        .insert(insertPayload)
        .select("id")
        .single();
      if (error) throw error;

      // Upload photos
      const uploadedPaths: string[] = [];
      for (const file of photos) {
        const path = `${wo.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("evidence-photos").upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
        if (upErr) {
          console.error("upload err", upErr);
          toast({ title: "Fotoğraf yüklenemedi", description: upErr.message, variant: "destructive" });
        } else {
          uploadedPaths.push(path);
        }
      }
      if (uploadedPaths.length > 0) {
        await supabase.from("work_orders").update({ evidence_photo_urls: uploadedPaths }).eq("id", wo.id);
      }

      toast({ title: "İş emri oluşturuldu", description: code });
      navigate(`/app/work-orders/${wo.id}`, { replace: true });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Kayıt başarısız", description: e.message ?? "Bilinmeyen hata", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Yeni Arıza Kaydı</h1>
        <p className="text-sm text-muted-foreground">Sahadan gelen arızayı yapılandırılmış olarak kaydedin.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mic className="w-4 h-4" /> Sesli giriş (opsiyonel)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!speechAvailable && (
            <p className="text-xs text-amber-600">
              Tarayıcınız sesli kayıt desteklemiyor. Aşağıdaki kutuya konuştuğunuzu yazıp "Form'a Aktar" düğmesini kullanabilirsiniz.
            </p>
          )}
          <div className="flex gap-2">
            {!recording ? (
              <Button type="button" variant="outline" onClick={startRecording} disabled={!speechAvailable}>
                <Mic className="w-4 h-4 mr-2" />Kaydı başlat
              </Button>
            ) : (
              <Button type="button" variant="destructive" onClick={stopRecording}>
                <MicOff className="w-4 h-4 mr-2" />Durdur
              </Button>
            )}
            <Button type="button" onClick={callVoiceFunction} disabled={aiBusy || !transcript.trim()}>
              {aiBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
              Form'a Aktar
            </Button>
          </div>
          <Textarea
            placeholder="Konuştuklarınız buraya yazılacak. İsterseniz elle de düzeltebilirsiniz."
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={4}
          />
          {transcribing && <p className="text-xs text-muted-foreground">Dinleniyor...</p>}
        </CardContent>
      </Card>

      <form onSubmit={submit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">İş emri bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Ekipman / Makine</Label>
              <Select value={form.machine_id} onValueChange={onPickMachine}>
                <SelectTrigger>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="complaint">Arıza açıklaması *</Label>
              <Input id="complaint" value={form.complaint} onChange={(e) => update("complaint")(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Belirti / detay</Label>
              <Textarea id="description" rows={3} value={form.description} onChange={(e) => update("description")(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="city">Şehir</Label>
                <Input id="city" value={form.city} onChange={(e) => update("city")(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="district">İlçe</Label>
                <Input id="district" value={form.district} onChange={(e) => update("district")(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Öncelik</Label>
                <Select value={form.badge} onValueChange={update("badge")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="photos" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />Fotoğraf / kanıt
              </Label>
              <Input id="photos" type="file" multiple accept={ACCEPTED_TYPES.join(",")} onChange={(e) => onFiles(e.target.files)} />
              {photos.length > 0 && (
                <ul className="text-xs text-muted-foreground space-y-1">
                  {photos.map((f, i) => (
                    <li key={i}>{f.name} — {(f.size / 1024).toFixed(0)} KB</li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>İptal</Button>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Kaydet
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NewWorkOrder;
