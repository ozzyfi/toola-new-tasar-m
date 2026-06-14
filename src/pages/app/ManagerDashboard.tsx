import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { STATUS, STATUS_LABEL, STATUS_DOT, hasEvidence } from "@/lib/workOrders";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Activity, AlertTriangle, FileWarning, Sparkles, ChevronRight, X } from "lucide-react";

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

type FilterKey = null | "open" | "closed_no_evidence" | "no_root_cause";

const ManagerDashboard = () => {
  const [items, setItems] = useState<WO[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>(null);

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
    const open = items.filter((w) => (w.status ?? STATUS.open) !== STATUS.closed);
    const closedThisMonth = items.filter((w) => {
      if (w.status !== STATUS.closed || !w.closed_at) return false;
      const d = new Date(w.closed_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
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
    return items.slice(0, 12);
  }, [filter, items, metrics]);

  const closureQuality = metrics.closedThisMonth.length === 0
    ? 0
    : Math.round((100 * (metrics.closedThisMonth.length - metrics.closedNoEvidence.length)) / Math.max(metrics.closedThisMonth.length, 1));

  return (
    <div className="space-y-6">
      {/* Hero summary — premium dark */}
      <section className="surface-ink p-6 sm:p-8">
        <div className="flex items-center gap-2 label-eyebrow text-ink-muted">
          <Sparkles className="w-3.5 h-3.5 text-primary" /> Operasyon Özeti
        </div>
        <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-6">
          <BigMetric label="Açık iş emri" value={metrics.open.length} accent />
          <BigMetric label="Bu ay kapanan" value={metrics.closedThisMonth.length} />
          <BigMetric label="Kanıtsız kapanan" value={metrics.closedNoEvidence.length} warning={metrics.closedNoEvidence.length > 0} />
          <BigMetric label="Kapanış kalitesi" value={`${closureQuality}%`} />
        </div>
      </section>

      {/* Quick action chips */}
      <div className="flex flex-wrap gap-2">
        <ChipButton active={filter === "open"} onClick={() => setFilter(filter === "open" ? null : "open")} icon={<Activity className="w-3.5 h-3.5" />}>
          Açık ({metrics.open.length})
        </ChipButton>
        <ChipButton active={filter === "closed_no_evidence"} onClick={() => setFilter(filter === "closed_no_evidence" ? null : "closed_no_evidence")} icon={<FileWarning className="w-3.5 h-3.5" />}>
          Kanıtsız kapanan ({metrics.closedNoEvidence.length})
        </ChipButton>
        <ChipButton active={filter === "no_root_cause"} onClick={() => setFilter(filter === "no_root_cause" ? null : "no_root_cause")} icon={<AlertTriangle className="w-3.5 h-3.5" />}>
          Kök nedensiz ({metrics.noRootCause.length})
        </ChipButton>
        {filter && (
          <button onClick={() => setFilter(null)} className="pill bg-secondary text-foreground/70 border border-border hover:bg-muted">
            <X className="w-3 h-3" /> Filtreyi temizle
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Yükleniyor…</p>
      ) : (
        <>
          {/* Two-column lists */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ListCard title="En problemli ekipmanlar" emptyText="Veri yok.">
              {metrics.topMachines.map((m, i) => (
                <RankRow key={i} rank={i + 1} name={m.name} count={m.count} suffix="arıza" />
              ))}
            </ListCard>
            <ListCard title="Tekrar eden arızalar" emptyText="Tekrar tespit edilmedi.">
              {metrics.recurring.map((m, i) => (
                <RankRow key={i} rank={i + 1} name={m.name} count={m.count} suffix="× tekrar" accent />
              ))}
            </ListCard>
          </div>

          {/* Activity */}
          <section className="surface-card p-6 sm:p-7 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">
                {filter === "open" && "Açık iş emirleri"}
                {filter === "closed_no_evidence" && "Kanıtsız kapanan"}
                {filter === "no_root_cause" && "Kök nedensiz kapanan"}
                {!filter && "Son saha aktivitesi"}
              </h2>
              <span className="text-xs text-muted-foreground">{filtered.length} kayıt</span>
            </div>
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">Kayıt yok.</p>
            ) : (
              <ul className="divide-y divide-border">
                {filtered.map((w) => {
                  const s = w.status ?? STATUS.open;
                  return (
                    <li key={w.id}>
                      <Link to={`/app/work-orders/${w.id}`} className="flex items-center gap-3 py-3 hover:bg-secondary/60 rounded-2xl px-2 -mx-2 transition">
                        <span className={cn("w-2 h-2 rounded-full shrink-0", STATUS_DOT[s])} />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-muted-foreground font-mono">{w.code} · {w.machines?.name ?? "—"}</div>
                          <div className="text-sm font-medium truncate">{w.complaint || "(Açıklama yok)"}</div>
                        </div>
                        <span className="pill bg-secondary text-foreground/70 border border-border">{STATUS_LABEL[s] ?? s}</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
};

const BigMetric = ({ label, value, accent, warning }: { label: string; value: number | string; accent?: boolean; warning?: boolean }) => (
  <div>
    <div className={cn(
      "font-display text-5xl sm:text-6xl font-extrabold leading-none",
      accent && "text-primary",
      warning && "text-[hsl(var(--warning))]",
    )}>
      {value}
    </div>
    <div className="mt-2 text-sm text-ink-muted">{label}</div>
  </div>
);

const ChipButton = ({ active, onClick, icon, children }: { active?: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={cn(
      "inline-flex items-center gap-2 rounded-full px-4 h-10 text-sm font-semibold transition border",
      active
        ? "bg-ink text-ink-foreground border-ink"
        : "bg-card text-foreground/80 border-border hover:bg-secondary",
    )}
  >
    {icon}{children}
  </button>
);

const ListCard = ({ title, emptyText, children }: { title: string; emptyText: string; children: React.ReactNode }) => {
  const arr = Array.isArray(children) ? children : [children];
  const hasContent = arr.filter(Boolean).length > 0;
  return (
    <section className="surface-card p-6">
      <h3 className="font-display text-base font-bold mb-3">{title}</h3>
      {hasContent ? <ul className="space-y-2">{children}</ul> : <p className="text-sm text-muted-foreground">{emptyText}</p>}
    </section>
  );
};

const RankRow = ({ rank, name, count, suffix, accent }: { rank: number; name: string; count: number; suffix: string; accent?: boolean }) => (
  <li className="flex items-center justify-between gap-3 rounded-2xl bg-secondary/60 px-3 py-2.5">
    <div className="flex items-center gap-3 min-w-0">
      <span className={cn(
        "w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0",
        accent ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground",
      )}>
        {rank}
      </span>
      <span className="text-sm font-medium truncate">{name}</span>
    </div>
    <span className="text-xs text-muted-foreground font-semibold">{count} {suffix}</span>
  </li>
);

export default ManagerDashboard;
