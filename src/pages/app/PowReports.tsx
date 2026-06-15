import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { FileText, Download, Loader2, Search, ShieldCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { callGeneratePowReport } from "@/lib/edgeFunctions";
import { isQualityClosure, hasEvidence } from "@/lib/workOrders";

type WO = {
  id: string;
  code: string;
  complaint: string | null;
  region: string | null;
  closed_at: string | null;
  closing_notes: any;
  evidence_photo_urls: any;
  status: string | null;
  machines?: { name: string } | null;
};

const PowReports = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<WO[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("work_orders")
        .select("id, code, complaint, region, closed_at, closing_notes, evidence_photo_urls, status, machines(name)")
        .eq("status", "kapali")
        .order("closed_at", { ascending: false })
        .limit(100);
      setItems((data ?? []) as any);
    })();
  }, []);

  const generate = async (wo: WO) => {
    if (!user) return;
    setBusy(wo.id);
    try {
      const r = await callGeneratePowReport(wo.id, user.id);
      if (!r.success || !r.report_url) throw new Error(r.error ?? "Rapor üretilemedi");
      window.open(r.report_url, "_blank");
      toast({ title: "Rapor hazır", description: wo.code });
    } catch (e: any) {
      toast({ title: "Üretilemedi", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  const filtered = items.filter((wo) =>
    !q.trim() ||
    (wo.code + " " + (wo.complaint ?? "") + " " + (wo.machines?.name ?? "")).toLocaleLowerCase("tr").includes(q.toLocaleLowerCase("tr")),
  );

  return (
    <>
      <PageHeader
        eyebrow="Yönetici · PoW Raporları"
        title="Proof of Work"
        description="Kapanmış iş emirleri için kanıt-tabanlı PDF rapor üret ve indir."
      />

      <div className="mb-5 relative">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Kod, makine veya şikayet ara…" className="h-12 pl-11 rounded-full bg-secondary border-0" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<FileText className="w-5 h-5" />} title="Kapalı iş emri yok" />
      ) : (
        <ul className="space-y-3">
          {filtered.map((wo) => {
            const quality = isQualityClosure(wo);
            return (
              <li key={wo.id} className="surface-card p-5 flex flex-wrap items-center gap-4">
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-muted-foreground font-mono">{wo.code}</div>
                  <div className="font-display font-bold mt-0.5 truncate">{wo.machines?.name ?? wo.complaint ?? "İş emri"}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {wo.closed_at ? new Date(wo.closed_at).toLocaleString("tr-TR") : "—"}
                  </div>
                </div>
                {quality ? (
                  <span className="pill bg-success/12 text-[hsl(var(--success))] border border-[hsl(var(--success))]/25">
                    <ShieldCheck className="w-3 h-3" /> Kanıtlı
                  </span>
                ) : (
                  <span className="pill bg-warning/15 text-[hsl(var(--warning))] border border-[hsl(var(--warning))]/25">
                    Eksik kanıt
                  </span>
                )}
                <Button
                  onClick={() => generate(wo)}
                  disabled={busy === wo.id || !hasEvidence(wo)}
                  className="rounded-full"
                  size="sm"
                >
                  {busy === wo.id ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1.5" />}
                  PoW üret
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
};

export default PowReports;
