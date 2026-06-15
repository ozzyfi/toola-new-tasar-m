import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { Film, Upload, Sparkles, Loader2, Play } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { callVideoToSop, signUrl } from "@/lib/edgeFunctions";
import { cn } from "@/lib/utils";

type Vid = {
  id: string;
  storage_path: string | null;
  status: string | null;
  summary: string | null;
  sop_steps: any;
  wo_id: string | null;
  machine_id: string | null;
  created_at: string;
};
type Machine = { id: string; name: string };

const RepairVideos = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Vid[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [machineId, setMachineId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [open, setOpen] = useState<Vid | null>(null);
  const [playUrl, setPlayUrl] = useState<string | null>(null);

  const load = async () => {
    const [{ data: vids }, { data: ms }] = await Promise.all([
      supabase
        .from("repair_videos")
        .select("id, storage_path, status, summary, sop_steps, wo_id, machine_id, created_at")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("machines").select("id, name").order("name").limit(200),
    ]);
    setItems((vids ?? []) as Vid[]);
    setMachines((ms ?? []) as Machine[]);
  };
  useEffect(() => { load(); }, []);

  const upload = async () => {
    if (!user || !file) return;
    if (file.size > 200 * 1024 * 1024) {
      toast({ title: "Çok büyük", description: "Video 200 MB altında olmalı.", variant: "destructive" });
      return;
    }
    setUploading(true);
    const path = `${user.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("repair-videos").upload(path, file, { contentType: file.type });
    if (upErr) {
      setUploading(false);
      toast({ title: "Yüklenemedi", description: upErr.message, variant: "destructive" });
      return;
    }
    const { error: insErr } = await supabase.from("repair_videos").insert({
      storage_path: path,
      status: "uploaded",
      machine_id: machineId || null,
    });
    setUploading(false);
    if (insErr) { toast({ title: "Kaydedilemedi", description: insErr.message, variant: "destructive" }); return; }
    setFile(null); setMachineId("");
    toast({ title: "Video yüklendi" });
    load();
  };

  const analyze = async (v: Vid) => {
    setAnalyzing(v.id);
    try {
      await callVideoToSop(v.id);
      toast({ title: "SOP üretildi" });
      await load();
    } catch (e: any) {
      toast({ title: "Üretilemedi", description: e.message, variant: "destructive" });
    } finally {
      setAnalyzing(null);
    }
  };

  const openDetail = async (v: Vid) => {
    setOpen(v);
    setPlayUrl(v.storage_path ? await signUrl("repair-videos", v.storage_path, 3600) : null);
  };

  return (
    <>
      <PageHeader
        eyebrow="Video → SOP"
        title="Onarım Videoları"
        description="Sahadan video yükle; ToolA adım adım SOP üretir."
      />

      <section className="surface-ink p-6 mb-5 space-y-4">
        <div className="flex items-center gap-2 label-eyebrow text-ink-muted">
          <Upload className="w-3.5 h-3.5" /> Yeni video
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-ink-muted text-xs uppercase">Dosya</Label>
            <Input
              type="file"
              accept="video/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="bg-ink-elevated border-ink-border text-ink-foreground file:text-ink-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-ink-muted text-xs uppercase">Makine (opsiyonel)</Label>
            <Select value={machineId} onValueChange={setMachineId}>
              <SelectTrigger className="bg-ink-elevated border-ink-border text-ink-foreground"><SelectValue placeholder="Seç" /></SelectTrigger>
              <SelectContent>
                {machines.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={upload} disabled={!file || uploading} className="rounded-full">
          {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Yükle
        </Button>
      </section>

      {items.length === 0 ? (
        <EmptyState icon={<Film className="w-5 h-5" />} title="Henüz video yok" description="Bir video yükle ve SOP üretelim." />
      ) : (
        <ul className="grid sm:grid-cols-2 gap-3">
          {items.map((v) => (
            <li key={v.id} className="surface-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="label-eyebrow">{new Date(v.created_at).toLocaleString("tr-TR")}</div>
                  <div className="font-display font-bold mt-1 truncate">{v.summary ?? v.storage_path?.split("/").pop() ?? "Video"}</div>
                </div>
                <span className={cn("pill border text-xs", statusTone(v.status))}>{v.status ?? "—"}</span>
              </div>
              {Array.isArray(v.sop_steps) && v.sop_steps.length > 0 && (
                <div className="text-xs text-muted-foreground mt-2">{v.sop_steps.length} adımlık SOP</div>
              )}
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => openDetail(v)}>
                  <Play className="w-3.5 h-3.5 mr-1.5" /> Aç
                </Button>
                <Button
                  size="sm"
                  className="rounded-full"
                  disabled={analyzing === v.id}
                  onClick={() => analyze(v)}
                >
                  {analyzing === v.id ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                  SOP üret
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle className="font-display">{open?.summary ?? "Video"}</SheetTitle>
            <SheetDescription>{open && new Date(open.created_at).toLocaleString("tr-TR")}</SheetDescription>
          </SheetHeader>
          {open && (
            <div className="mt-5 space-y-4 text-sm">
              {playUrl && (
                <video src={playUrl} controls className="w-full rounded-2xl bg-black" />
              )}
              {Array.isArray(open.sop_steps) && open.sop_steps.length > 0 ? (
                <ol className="space-y-2">
                  {open.sop_steps.map((s: any, i: number) => (
                    <li key={i} className="rounded-2xl bg-secondary p-3 flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">{s.step ?? i + 1}</span>
                      <div className="min-w-0">
                        <div>{s.text}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {typeof s.time === "number" && <>≈ {s.time} dk · </>}
                          {typeof s.confidence === "number" && <>güven %{s.confidence}</>}
                        </div>
                        {s.safety_note && <div className="text-xs text-destructive mt-1">⚠ {s.safety_note}</div>}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">Henüz SOP üretilmedi.</p>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

const statusTone = (s: string | null) => {
  switch (s) {
    case "completed": return "bg-success/12 text-[hsl(var(--success))] border-[hsl(var(--success))]/25";
    case "processing": return "bg-warning/15 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/25";
    case "failed": return "bg-destructive/12 text-destructive border-destructive/25";
    default: return "bg-secondary text-foreground/70 border-border";
  }
};

export default RepairVideos;
