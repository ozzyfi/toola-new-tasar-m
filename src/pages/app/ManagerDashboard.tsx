import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { STATUS, STATUS_LABEL, STATUS_TONE, hasEvidence } from "@/lib/workOrders";
import { toast } from "@/hooks/use-toast";

type WO = {
  id: string;
  code: string;
  complaint: string | null;
  status: string | null;
  evidence_photo_urls: any;
  closing_notes: any;
  closed_at: string | null;
  created_at: string;
  machine_id: string | null;
  machines?: { name: string } | null;
};

const ManagerDashboard = () => {
  const [items, setItems] = useState<WO[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<null | "open" | "closed_no_evidence" | "no_root_cause">(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("work_orders")
        .select("id, code, complaint, status, evidence_photo_urls, closing_notes, closed_at, created_at, machine_id, machines(name)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) toast({ title: "Yüklenemedi", description: error.message, variant: "destructive" });
      setItems((data ?? []) as WO[]);
      setLoading(false);
    })();
  }, []);

  const metrics = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const open = items.filter((w) => (w.status ?? STATUS.open) !== STATUS.closed);
    const closedThisMonth = items.filter((w) => {
      if (w.status !== STATUS.closed || !w.closed_at) return false;
      const d = new Date(w.closed_at);
      return d.getMonth() === month && d.getFullYear() === year;
    });
    const closedNoEvidence = items.filter((w) => w.status === STATUS.closed && !hasEvidence(w));
    const noRootCause = items.filter((w) => w.status === STATUS.closed && !(w.closing_notes?.root_cause));

    const byMachine = new Map<string, { name: string; count: number }>();
    for (const w of items) {
      const name = w.machines?.name ?? "(Bilinmeyen)";
      const key = w.machine_id ?? name;
      const prev = byMachine.get(key) ?? { name, count: 0 };
      byMachine.set(key, { name, count: prev.count + 1 });
    }
    const topMachines = [...byMachine.values()].sort((a, b) => b.count - a.count).slice(0, 5);
    const recurring = [...byMachine.values()].filter((m) => m.count >= 2).sort((a, b) => b.count - a.count);

    return { open, closedThisMonth, closedNoEvidence, noRootCause, topMachines, recurring };
  }, [items]);

  const filtered = useMemo(() => {
    if (filter === "open") return metrics.open;
    if (filter === "closed_no_evidence") return metrics.closedNoEvidence;
    if (filter === "no_root_cause") return metrics.noRootCause;
    return items.slice(0, 10);
  }, [filter, items, metrics]);

  const Metric = ({ label, value, id }: { label: string; value: number; id?: any }) => (
    <button
      onClick={() => id && setFilter(id)}
      className={`text-left rounded-lg border p-4 transition-colors w-full ${
        id ? "hover:border-primary cursor-pointer" : "cursor-default"
      }`}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </button>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Yönetici Paneli</h1>
        <p className="text-sm text-muted-foreground">Sahanın gerçek anlık görünümü.</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Yükleniyor...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Metric label="Açık iş emirleri" value={metrics.open.length} id="open" />
            <Metric label="Bu ay kapanan" value={metrics.closedThisMonth.length} />
            <Metric label="Kanıtsız kapanan" value={metrics.closedNoEvidence.length} id="closed_no_evidence" />
            <Metric label="Kök nedensiz kapanan" value={metrics.noRootCause.length} id="no_root_cause" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">En problemli ekipmanlar</CardTitle></CardHeader>
              <CardContent>
                {metrics.topMachines.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Veri yok.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {metrics.topMachines.map((m, i) => (
                      <li key={i} className="flex justify-between"><span>{m.name}</span><span className="text-muted-foreground">{m.count} arıza</span></li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Tekrar eden arızalar</CardTitle></CardHeader>
              <CardContent>
                {metrics.recurring.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Tekrar tespit edilmedi.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {metrics.recurring.map((m, i) => (
                      <li key={i} className="flex justify-between"><span>{m.name}</span><span className="text-muted-foreground">{m.count}× tekrar</span></li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">
                {filter === "open" && "Açık iş emirleri"}
                {filter === "closed_no_evidence" && "Kanıtsız kapanan iş emirleri"}
                {filter === "no_root_cause" && "Kök nedensiz kapanan iş emirleri"}
                {!filter && "Son saha aktivitesi"}
              </CardTitle>
              {filter && (
                <button className="text-xs text-primary hover:underline" onClick={() => setFilter(null)}>
                  Filtreyi temizle
                </button>
              )}
            </CardHeader>
            <CardContent>
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground">Kayıt yok.</p>
              ) : (
                <ul className="divide-y">
                  {filtered.map((w) => {
                    const s = w.status ?? STATUS.open;
                    return (
                      <li key={w.id}>
                        <Link to={`/app/work-orders/${w.id}`} className="block py-2 hover:bg-accent rounded px-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-xs text-muted-foreground">{w.code} · {w.machines?.name ?? "—"}</div>
                              <div className="text-sm truncate">{w.complaint || "(Açıklama yok)"}</div>
                            </div>
                            <Badge variant="outline" className={STATUS_TONE[s] ?? ""}>{STATUS_LABEL[s] ?? s}</Badge>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default ManagerDashboard;
