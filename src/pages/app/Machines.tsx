import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Factory, MapPin, Search } from "lucide-react";

type M = { id: string; name: string; model: string | null; serial_no: string | null; city: string | null; district: string | null; status: string | null };

const Machines = () => {
  const [items, setItems] = useState<M[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("machines")
        .select("id, name, model, serial_no, city, district, status")
        .order("name");
      if (error) toast({ title: "Yüklenemedi", description: error.message, variant: "destructive" });
      setItems((data ?? []) as M[]);
      setLoading(false);
    })();
  }, []);

  const filtered = items.filter((m) =>
    !q ? true : [m.name, m.model, m.serial_no, m.city].some((v) => (v ?? "").toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div className="space-y-5">
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Ekipman, model, seri no…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-12 pl-12 rounded-full bg-secondary border-0"
        />
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Yükleniyor…</p>
      ) : filtered.length === 0 ? (
        <div className="surface-card p-10 text-center">
          <div className="mx-auto icon-tile w-14 h-14"><Factory className="w-6 h-6" /></div>
          <p className="mt-3 text-sm text-muted-foreground">Bölgenizde kayıtlı ekipman yok.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((m) => (
            <Link key={m.id} to={`/app/machines/${m.id}`} className="surface-card p-5 flex items-start gap-4 hover:shadow-float transition">
              <div className="icon-tile w-12 h-12 shrink-0"><Factory className="w-5 h-5" /></div>
              <div className="min-w-0 flex-1">
                <div className="font-display font-bold text-lg truncate">{m.name}</div>
                <div className="text-sm text-muted-foreground truncate">
                  {[m.model, m.serial_no].filter(Boolean).join(" · ") || "—"}
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  {[m.district, m.city].filter(Boolean).join(", ") || "—"}
                  {m.status && (
                    <span className="pill bg-secondary border border-border text-foreground/70 ml-1">{m.status}</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Machines;
