import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

type M = { id: string; name: string; model: string | null; serial_no: string | null; city: string | null; district: string | null; status: string | null };

const Machines = () => {
  const [items, setItems] = useState<M[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("machines").select("id, name, model, serial_no, city, district, status").order("name");
      if (error) toast({ title: "Yüklenemedi", description: error.message, variant: "destructive" });
      setItems((data ?? []) as M[]);
      setLoading(false);
    })();
  }, []);

  const filtered = items.filter((m) =>
    !q ? true : [m.name, m.model, m.serial_no, m.city].some((v) => (v ?? "").toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Ekipmanlar</h1>
      <Input placeholder="Ara" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
      {loading ? (
        <p className="text-muted-foreground text-sm">Yükleniyor...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Bölgenizde kayıtlı ekipman yok.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((m) => (
            <Card key={m.id}>
              <CardContent className="p-4">
                <div className="font-medium">{m.name}</div>
                <div className="text-sm text-muted-foreground">
                  {[m.model, m.serial_no].filter(Boolean).join(" · ") || "—"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {[m.district, m.city].filter(Boolean).join(", ") || "—"} · {m.status ?? "—"}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Machines;
