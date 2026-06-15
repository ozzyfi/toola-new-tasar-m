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
import { FileBarChart, Upload, Sparkles, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { callLogAnalyzer } from "@/lib/edgeFunctions";
import { cn } from "@/lib/utils";

type LogRow = {
  id: string;
  file_name: string | null;
  storage_path: string | null;
  status: string | null;
  findings: any;
  recommendations: any;
  recurring_match: any;
  error_msg: string | null;
  machine_id: string | null;
  created_at: string;
};
type Machine = { id: string; name: string };

const MachineLogs = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<LogRow[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [machineId, setMachineId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [open, setOpen] = useState<LogRow | null>(null);

  const load = async () => {
    const [{ data }, { data: ms }] = await Promise.all([
      supabase
        .from("machine_logs")
        .select("id, file_name, storage_path, status, findings, recommendations, recurring_match, error_msg, machine_id, created_at")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("machines").select("id, name").order("name").limit(200),
    ]);
    setItems((data ?? []) as LogRow[]);
    setMachines((ms ?? []) as Machine[]);
  };
  useEffect(() => { load(); }, []);

  const upload = async () => {
    if (!user || !file) return;
    if (file.size > 30 * 1024 * 1024) {
      toast({ title: "Çok büyük", description: "Log 30 MB altında olmalı.", variant: "destructive" });
      return;
    }
    setUploading(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${user.id}/${Date.now()}_${safeName}`;
    const { error: upErr } = await supabase.storage.from("machine-logs").upload(path, file, { contentType: file.type || "text/plain" });
    if (upErr) { setUploading(false); toast({ title: "Yüklenemedi", description: upErr.message, variant: "destructive" }); return; }
    const { error: insErr } = await supabase.from("machine_logs").insert({
      storage_path: path,
      file_name: file.name,
      status: "uploaded",
      machine_id: machineId || null,
    });
    setUploading(false);
    if (insErr) { toast({ title: "Kaydedilemedi", description: insErr.message, variant: "destructive" }); return; }
    setFile(null); setMachineId("");
    toast({ title: "Log yüklendi" });
    load();
  };

  const analyze = async (l: LogRow) => {
    setAnalyzing(l.id);
    try {
      await callLogAnalyzer(l.id);
      toast({ title: "Log analiz edildi" });
      await load();
    } catch (e: any) {
      toast({ title: "Analiz başarısız", description: e.message, variant: "destructive" });
    } finally { setAnalyzing(null); }
  };

  return (
    <>
      <PageHeader
        eyebrow="Log Analizi"
        title="Makine Logları"
        description="Log dosyalarını yükle; ToolA alarmları, sıklığı ve önerileri çıkarsın."
      />

      <section className="surface-ink p-6 mb-5 space-y-4">
        <div className="flex items-center gap-2 label-eyebrow text-ink-muted">
          <Upload className="w-3.5 h-3.5" /> Yeni log
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-ink-muted text-xs uppercase">Dosya (.csv / .log / .txt)</Label>
            <Input
              type="file"
              accept=".csv,.log,.txt,text/plain"
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
        <EmptyState icon={<FileBarChart className="w-5 h-5" />} title="Log yok" description="Bir log dosyası yükle ve analiz başlatalım." />
      ) : (
        <ul className="grid sm:grid-cols-2 gap-3">
          {items.map((l) => {
            const findings = Array.isArray(l.findings) ? l.findings : [];
            return (
              <li key={l.id} className="surface-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="label-eyebrow">{new Date(l.created_at).toLocaleString("tr-TR")}</div>
                    <div className="font-display font-bold mt-1 truncate">{l.file_name ?? "log"}</div>
                  </div>
                  <span className={cn("pill border text-xs", statusTone(l.status))}>{l.status ?? "—"}</span>
                </div>
                {findings.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-2">{findings.length} bulgu</div>
                )}
                {l.error_msg && (
                  <div className="mt-2 text-xs text-destructive flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3" /> {l.error_msg}
                  </div>
                )}
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="outline" className="rounded-full" onClick={() => setOpen(l)}>Detay</Button>
                  <Button size="sm" className="rounded-full" onClick={() => analyze(l)} disabled={analyzing === l.id}>
                    {analyzing === l.id ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                    Analiz et
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Sheet open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle className="font-display">{open?.file_name ?? "Log"}</SheetTitle>
            <SheetDescription>{open && new Date(open.created_at).toLocaleString("tr-TR")}</SheetDescription>
          </SheetHeader>
          {open && (
            <div className="mt-5 space-y-5 text-sm">
              <Section label="Bulgular">
                {Array.isArray(open.findings) && open.findings.length > 0 ? (
                  <ul className="space-y-2">
                    {open.findings.map((f: any, i: number) => (
                      <li key={i} className="rounded-2xl bg-secondary p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold truncate">{f.alarm}</span>
                          <span className={cn("pill border text-xs", severityTone(f.severity))}>{f.severity}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {f.count}× · {f.first_seen} → {f.last_seen}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-muted-foreground">—</p>}
              </Section>
              <Section label="Öneriler">
                {Array.isArray(open.recommendations) && open.recommendations.length > 0 ? (
                  <ul className="space-y-2">
                    {open.recommendations.map((r: any, i: number) => (
                      <li key={i} className="rounded-2xl bg-secondary p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{r.action}</span>
                          <span className="pill border bg-primary/10 text-primary border-primary/25 text-xs">{r.priority}</span>
                        </div>
                        {r.reason && <div className="text-xs text-muted-foreground mt-1">{r.reason}</div>}
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-muted-foreground">—</p>}
              </Section>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <div className="label-eyebrow mb-2">{label}</div>
    {children}
  </div>
);
const statusTone = (s: string | null) => {
  switch (s) {
    case "completed": return "bg-success/12 text-[hsl(var(--success))] border-[hsl(var(--success))]/25";
    case "processing": return "bg-warning/15 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/25";
    case "failed": return "bg-destructive/12 text-destructive border-destructive/25";
    default: return "bg-secondary text-foreground/70 border-border";
  }
};
const severityTone = (s: string) => {
  if (s === "critical") return "bg-destructive/12 text-destructive border-destructive/25";
  if (s === "warning") return "bg-warning/15 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/25";
  return "bg-secondary text-foreground/70 border-border";
};

export default MachineLogs;
