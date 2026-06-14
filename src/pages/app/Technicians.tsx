import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { initials } from "@/lib/workOrders";
import { Users } from "lucide-react";

type T = { id: string; full_name: string; region: string | null; city: string | null; experience_years: number | null; client: string | null };

const Technicians = () => {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("technicians")
        .select("id, full_name, region, city, experience_years, client")
        .order("full_name");
      if (error) toast({ title: "Yüklenemedi", description: error.message, variant: "destructive" });
      setItems((data ?? []) as T[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-5">
      {loading ? (
        <p className="text-sm text-muted-foreground">Yükleniyor…</p>
      ) : items.length === 0 ? (
        <div className="surface-card p-10 text-center">
          <div className="mx-auto icon-tile w-14 h-14"><Users className="w-6 h-6" /></div>
          <p className="mt-3 text-sm text-muted-foreground">Bölgenizde kayıtlı teknisyen yok.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((t) => (
            <article key={t.id} className="surface-card p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center shrink-0">
                {initials(t.full_name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display font-bold truncate">{t.full_name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {[t.region, t.city].filter(Boolean).join(" · ") || "—"}
                  {typeof t.experience_years === "number" ? ` · ${t.experience_years} yıl` : ""}
                </div>
                {t.client && <div className="text-xs text-muted-foreground mt-0.5 truncate">{t.client}</div>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default Technicians;
