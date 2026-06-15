import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { ArrowLeft, Factory, MapPin, Calendar, Wrench, AlertTriangle, ClipboardList } from "lucide-react";

type Machine = {
  id: string; name: string; model: string | null; serial_no: string | null;
  city: string | null; district: string | null; region: string | null;
  client: string | null; status: string | null; operating_hours: number | null;
  last_service: string | null; next_maintenance: string | null;
  alert_text: string | null; risk_score: number | null; risk_note: string | null;
};
type Hist = { id: string; service_date: string; description: string; duration_hours: number | null; technician_name: string | null; wo_id: string | null };
type WO = { id: string; code: string; complaint: string | null; status: string | null; created_at: string };
type Part = { id: string; part_name: string; part_no: string | null; probability: number | null; stock_status: string | null; wo_id: string | null };

const MachineDetail = () => {
  const { id } = useParams();
  const [m, setM] = useState<Machine | null>(null);
  const [hist, setHist] = useState<Hist[]>([]);
  const [wos, setWos] = useState<WO[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const [{ data: machine }, { data: h }, { data: w }] = await Promise.all([
        supabase.from("machines").select("*").eq("id", id).maybeSingle(),
        supabase.from("machine_service_history").select("*").eq("machine_id", id).order("service_date", { ascending: false }).limit(50),
        supabase.from("work_orders").select("id, code, complaint, status, created_at").eq("machine_id", id).order("created_at", { ascending: false }).limit(20),
      ]);
      setM(machine as Machine | null);
      setHist((h ?? []) as Hist[]);
      setWos((w ?? []) as WO[]);
      const woIds = (w ?? []).map((x: any) => x.id);
      if (woIds.length) {
        const { data: p } = await supabase.from("work_order_parts").select("*").in("wo_id", woIds).limit(50);
        setParts((p ?? []) as Part[]);
      } else setParts([]);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <p className="text-sm text-muted-foreground">Yükleniyor…</p>;
  if (!m) return (
    <div className="space-y-4">
      <p>Makine bulunamadı.</p>
      <Button asChild variant="outline" className="rounded-full"><Link to="/app/machines"><ArrowLeft className="w-4 h-4 mr-2" />Listeye dön</Link></Button>
    </div>
  );

  return (
    <div className="space-y-5 max-w-4xl">
      <Button asChild variant="ghost" size="sm" className="rounded-full -ml-2">
        <Link to="/app/machines"><ArrowLeft className="w-4 h-4 mr-2" />Ekipmanlar</Link>
      </Button>

      <section className="surface-card p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="label-eyebrow">{m.client ?? "—"}</div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">{m.name}</h1>
            <div className="text-sm text-muted-foreground mt-1">{m.model ?? "—"}{m.serial_no ? ` · ${m.serial_no}` : ""}</div>
          </div>
          <div className="icon-tile w-14 h-14 shrink-0"><Factory className="w-6 h-6" /></div>
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <Meta icon={<MapPin className="w-3.5 h-3.5" />} label="Lokasyon" value={[m.district, m.city].filter(Boolean).join(", ") || "—"} sub={m.region ?? undefined} />
          <Meta icon={<Wrench className="w-3.5 h-3.5" />} label="Çalışma" value={m.operating_hours != null ? `${m.operating_hours} sa` : "—"} />
          <Meta icon={<Calendar className="w-3.5 h-3.5" />} label="Son bakım" value={fmt(m.last_service)} />
          <Meta icon={<Calendar className="w-3.5 h-3.5" />} label="Sonraki bakım" value={fmt(m.next_maintenance)} />
        </div>
        {(m.alert_text || m.risk_note) && (
          <div className="mt-4 rounded-2xl bg-warning/15 border border-[hsl(var(--warning))]/30 p-3 text-sm flex gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 text-[hsl(var(--warning))] shrink-0" />
            <div>
              {m.alert_text && <div>{m.alert_text}</div>}
              {m.risk_note && <div className="text-xs text-muted-foreground mt-1">Risk %{m.risk_score ?? 0} — {m.risk_note}</div>}
            </div>
          </div>
        )}
      </section>

      <section className="surface-card p-6 sm:p-7">
        <h2 className="font-display text-lg font-bold mb-3 flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> Bakım zaman tüneli</h2>
        {hist.length === 0 ? (
          <EmptyState title="Geçmiş kaydı yok" />
        ) : (
          <ul className="space-y-3">
            {hist.map((h) => (
              <li key={h.id} className="rounded-2xl border border-border p-4 flex gap-4">
                <div className="text-xs text-muted-foreground font-mono shrink-0 w-24">{fmt(h.service_date)}</div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{h.description}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {h.technician_name ?? "—"}{h.duration_hours != null && <> · {h.duration_hours} sa</>}
                  </div>
                </div>
                {h.wo_id && (
                  <Button asChild size="sm" variant="ghost" className="rounded-full">
                    <Link to={`/app/work-orders/${h.wo_id}`}>İş emri</Link>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {wos.length > 0 && (
        <section className="surface-card p-6 sm:p-7">
          <h2 className="font-display text-lg font-bold mb-3 flex items-center gap-2"><ClipboardList className="w-4 h-4 text-primary" /> Son iş emirleri</h2>
          <ul className="space-y-2">
            {wos.map((w) => (
              <li key={w.id}>
                <Link to={`/app/work-orders/${w.id}`} className="flex items-center justify-between rounded-2xl border border-border p-3 hover:bg-secondary/60 transition">
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground font-mono">{w.code}</div>
                    <div className="font-semibold truncate">{w.complaint ?? "—"}</div>
                  </div>
                  <span className="pill bg-secondary border border-border text-xs">{w.status ?? "—"}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {parts.length > 0 && (
        <section className="surface-card p-6 sm:p-7">
          <h2 className="font-display text-lg font-bold mb-3">Sıkça kullanılan parçalar</h2>
          <ul className="grid sm:grid-cols-2 gap-3">
            {parts.map((p) => (
              <li key={p.id} className="rounded-2xl border border-border p-3">
                <div className="font-semibold">{p.part_name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {p.part_no ?? "—"}{p.stock_status && <> · {p.stock_status}</>}{p.probability != null && <> · %{p.probability}</>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

const Meta = ({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) => (
  <div className="rounded-2xl bg-secondary p-3">
    <div className="flex items-center gap-1.5 label-eyebrow">{icon}{label}</div>
    <div className="mt-1 font-semibold text-sm truncate">{value}</div>
    {sub && <div className="text-xs text-muted-foreground truncate">{sub}</div>}
  </div>
);

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("tr-TR") : "—");

export default MachineDetail;
