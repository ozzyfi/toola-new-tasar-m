import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  MapPin,
  Calendar,
  Search,
  Image as ImageIcon,
  AlertTriangle,
  Wrench,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {
  STATUS,
  STATUS_LABEL,
  STATUS_DOT,
  PRIORITY_LABEL,
  PRIORITY_DOT,
  hasEvidence,
} from "@/lib/workOrders";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
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
  evidence_photo_urls: any;
  closing_notes: any;
  closed_at: string | null;
  created_at: string;
  machines?: { name: string; model: string | null } | null;
};

type TabKey = "today" | "all" | "closed";

const TABS: { key: TabKey; label: string }[] = [
  { key: "today", label: "Bugün" },
  { key: "all", label: "Tümü" },
  { key: "closed", label: "Kapandı" },
];

function isToday(d: string) {
  const x = new Date(d);
  const n = new Date();
  return x.getDate() === n.getDate() && x.getMonth() === n.getMonth() && x.getFullYear() === n.getFullYear();
}

function timeLabel(d: string) {
  const x = new Date(d);
  if (isToday(d)) return `Bugün ${x.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`;
  return x.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
}

const WorkOrders = () => {
  const { user, isManager } = useAuth();
  const [items, setItems] = useState<WO[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("today");
  const [q, setQ] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("work_orders")
        .select(
          "id, code, complaint, description, status, badge, region, city, district, client, assigned_technician_id, evidence_photo_urls, closing_notes, closed_at, created_at, machines(name, model)",
        )
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) toast({ title: "Yüklenemedi", description: error.message, variant: "destructive" });
      setItems((data ?? []) as WO[]);
      setLoading(false);
    };
    load();
  }, []);

  const summary = useMemo(() => {
    const open = items.filter((w) => (w.status ?? STATUS.open) !== STATUS.closed).length;
    const closedToday = items.filter((w) => w.status === STATUS.closed && w.closed_at && isToday(w.closed_at)).length;
    const needsAttention = items.filter(
      (w) => w.status === STATUS.closed && !hasEvidence(w),
    ).length;
    return { open, closedToday, needsAttention };
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((w) => {
      if (tab === "today" && !isToday(w.created_at)) return false;
      if (tab === "closed" && w.status !== STATUS.closed) return false;
      if (!isManager && w.assigned_technician_id && user && w.assigned_technician_id !== user.id) return false;
      if (q) {
        const s = q.toLowerCase();
        return (
          (w.code ?? "").toLowerCase().includes(s) ||
          (w.complaint ?? "").toLowerCase().includes(s) ||
          (w.machines?.name ?? "").toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [items, tab, q, isManager, user]);

  return (
    <div className="space-y-6">
      {/* Hero dark summary card */}
      <section className="surface-ink p-6 sm:p-7 relative overflow-hidden">
        <div className="flex items-center gap-2 label-eyebrow text-ink-muted">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          Bugünün ToolA Özeti
        </div>
        <div className="mt-5 grid grid-cols-3 gap-4 sm:gap-8">
          <div>
            <div className="font-display text-5xl sm:text-6xl font-extrabold leading-none">
              {summary.open}
            </div>
            <div className="mt-2 text-sm text-ink-muted">Açık iş emri</div>
          </div>
          <div>
            <div className="font-display text-5xl sm:text-6xl font-extrabold leading-none text-primary">
              {summary.closedToday}
            </div>
            <div className="mt-2 text-sm text-ink-muted">Kapandı</div>
          </div>
          <div>
            <div className="font-display text-5xl sm:text-6xl font-extrabold leading-none">
              {summary.needsAttention}
            </div>
            <div className="mt-2 text-sm text-ink-muted">Kanıt eksik</div>
          </div>
        </div>

        <Link
          to="/app/work-orders/new"
          className="mt-6 flex items-center gap-3 rounded-2xl bg-ink-elevated/80 border border-ink-border px-3 py-3 hover:bg-ink-elevated transition"
        >
          <span className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
            <Plus className="w-5 h-5" strokeWidth={2.5} />
          </span>
          <div className="flex-1 text-sm">
            <span className="font-semibold text-ink-foreground">Yeni arıza kaydı</span>{" "}
            <span className="text-ink-muted">— sesli veya manuel</span>
          </div>
          <ChevronRight className="w-4 h-4 text-ink-muted" />
        </Link>
      </section>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Ekipman, lokasyon, iş emri…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-14 pl-12 rounded-full bg-secondary border-0 focus-visible:ring-2 focus-visible:ring-ring text-base"
        />
      </div>

      {/* Tab pills */}
      <div className="flex items-center gap-2 bg-secondary rounded-full p-1.5 w-full overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex-1 min-w-[96px] h-11 rounded-full text-sm font-semibold transition-all",
              tab === t.key
                ? "bg-card text-foreground shadow-card"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <SkeletonList />
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {filtered.map((w) => (
            <WorkOrderCard key={w.id} wo={w} />
          ))}
        </div>
      )}
    </div>
  );
};

const WorkOrderCard = ({ wo }: { wo: WO }) => {
  const status = wo.status ?? STATUS.open;
  const priority = wo.badge ?? "orta";
  const evidence = hasEvidence(wo);
  const isNew = isToday(wo.created_at) && status === STATUS.open;
  const loc = [wo.district, wo.city].filter(Boolean).join(", ");

  return (
    <Link to={`/app/work-orders/${wo.id}`} className="block group">
      <article className="surface-card p-5 sm:p-6 hover:shadow-float transition-shadow">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">#{wo.code.replace(/^WO-\d+-/, "")}</span>
              {loc && (<><span>·</span><span>{loc}</span></>)}
              {wo.client && (<><span>·</span><span>{wo.client}</span></>)}
            </div>
            <h3 className="mt-1.5 font-display text-xl font-bold text-foreground truncate">
              {wo.machines?.name || wo.complaint || "(Açıklama yok)"}
            </h3>
            {wo.machines?.name && wo.complaint && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{wo.complaint}</p>
            )}
          </div>
          <div className="icon-tile w-12 h-12 shrink-0">
            <Wrench className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="pill bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
              <span className={cn("w-1.5 h-1.5 rounded-full", PRIORITY_DOT[priority])} />
              {PRIORITY_LABEL[priority] ?? priority}
            </span>
            {isNew ? (
              <span className="pill bg-secondary text-foreground/70 border border-border uppercase tracking-wider">
                Yeni
              </span>
            ) : (
              <span className="pill bg-secondary text-foreground/70 border border-border">
                <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_DOT[status])} />
                {STATUS_LABEL[status] ?? status}
              </span>
            )}
            {evidence ? (
              <span className="pill bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border border-[hsl(var(--success))]/20">
                <ImageIcon className="w-3 h-3" /> Kanıt
              </span>
            ) : (
              <span className="pill bg-warning/10 text-[hsl(var(--warning))] border border-[hsl(var(--warning))]/20">
                <AlertTriangle className="w-3 h-3" /> Kanıtsız
              </span>
            )}
          </div>
          <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            {timeLabel(wo.created_at)}
          </div>
        </div>
      </article>
    </Link>
  );
};

const SkeletonList = () => (
  <div className="space-y-3">
    {[0, 1, 2].map((i) => (
      <div key={i} className="surface-card p-6 animate-pulse">
        <div className="h-3 w-1/3 bg-muted rounded mb-3" />
        <div className="h-5 w-2/3 bg-muted rounded mb-4" />
        <div className="flex gap-2">
          <div className="h-6 w-16 bg-muted rounded-full" />
          <div className="h-6 w-20 bg-muted rounded-full" />
        </div>
      </div>
    ))}
  </div>
);

const EmptyState = () => (
  <div className="surface-card p-10 text-center space-y-4">
    <div className="mx-auto icon-tile w-14 h-14"><Wrench className="w-6 h-6" /></div>
    <div>
      <div className="font-display text-lg font-bold">Henüz iş emri yok</div>
      <p className="text-sm text-muted-foreground mt-1">Sahadan ilk arızayı kaydedin — hafıza orada başlar.</p>
    </div>
    <Button asChild size="lg" className="rounded-full">
      <Link to="/app/work-orders/new"><Plus className="w-4 h-4 mr-2" />İlk Kaydı Oluştur</Link>
    </Button>
  </div>
);

export default WorkOrders;
