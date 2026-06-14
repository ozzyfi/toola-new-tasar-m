import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Plus, MapPin, Calendar, User, Image as ImageIcon, AlertTriangle } from "lucide-react";
import { STATUS, STATUS_LABEL, STATUS_TONE, PRIORITY_LABEL, PRIORITY_TONE, hasEvidence } from "@/lib/workOrders";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

type WO = {
  id: string;
  code: string;
  complaint: string | null;
  description: string | null;
  status: string | null;
  badge: string | null; // priority
  region: string | null;
  city: string | null;
  district: string | null;
  client: string | null;
  assigned_technician_id: string | null;
  evidence_photo_urls: any;
  created_at: string;
  machines?: { name: string; model: string | null } | null;
};

const WorkOrders = () => {
  const { user, isManager } = useAuth();
  const [items, setItems] = useState<WO[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "acik" | "devam" | "beklemede" | "kapali">("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("work_orders")
        .select("id, code, complaint, description, status, badge, region, city, district, client, assigned_technician_id, evidence_photo_urls, created_at, machines(name, model)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) {
        toast({ title: "Yüklenemedi", description: error.message, variant: "destructive" });
      }
      setItems((data ?? []) as WO[]);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((w) => {
      if (tab !== "all" && (w.status ?? STATUS.open) !== tab) return false;
      if (!isManager && w.assigned_technician_id && user && w.assigned_technician_id !== user.id) {
        // Show technician's assigned or unassigned ones in their region
        return false;
      }
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
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">İş Emirleri</h1>
          <p className="text-sm text-muted-foreground">
            {isManager ? "Bölgenizdeki tüm iş emirleri." : "Size atanmış ve bölgenize ait iş emirleri."}
          </p>
        </div>
        <Button asChild>
          <Link to="/app/work-orders/new">
            <Plus className="w-4 h-4 mr-2" />
            Yeni Arıza Kaydı
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full sm:w-auto">
          <TabsList className="grid grid-cols-5 sm:flex">
            <TabsTrigger value="all">Tümü</TabsTrigger>
            <TabsTrigger value="acik">Açık</TabsTrigger>
            <TabsTrigger value="devam">Devam</TabsTrigger>
            <TabsTrigger value="beklemede">Bekleme</TabsTrigger>
            <TabsTrigger value="kapali">Kapalı</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input placeholder="Ara (kod, arıza, ekipman)" value={q} onChange={(e) => setQ(e.target.value)} className="sm:max-w-xs" />
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Yükleniyor...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <p className="text-muted-foreground">Henüz iş emri yok.</p>
            <Button asChild>
              <Link to="/app/work-orders/new"><Plus className="w-4 h-4 mr-2" />İlk Arıza Kaydını Oluştur</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((w) => {
            const status = w.status ?? STATUS.open;
            const priority = w.badge ?? "orta";
            const evidence = hasEvidence(w);
            return (
              <Link key={w.id} to={`/app/work-orders/${w.id}`} className="block">
                <Card className="hover:border-primary transition-colors h-full">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground">{w.code}</div>
                        <div className="font-medium truncate">{w.complaint || "(Açıklama yok)"}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge variant="outline" className={STATUS_TONE[status] ?? ""}>{STATUS_LABEL[status] ?? status}</Badge>
                        <Badge variant="outline" className={PRIORITY_TONE[priority] ?? ""}>{PRIORITY_LABEL[priority] ?? priority}</Badge>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                      <span className="inline-flex items-center gap-1"><User className="w-3 h-3" />{w.machines?.name ?? "—"}</span>
                      {(w.city || w.district) && (
                        <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{[w.district, w.city].filter(Boolean).join(", ")}</span>
                      )}
                      <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(w.created_at).toLocaleDateString("tr-TR")}</span>
                      {evidence ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600"><ImageIcon className="w-3 h-3" />Kanıt var</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-600"><AlertTriangle className="w-3 h-3" />Kanıt yok</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WorkOrders;
