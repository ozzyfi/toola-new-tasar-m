import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

type T = { id: string; full_name: string; region: string | null; city: string | null; experience_years: number | null; client: string | null };

const Technicians = () => {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("technicians").select("id, full_name, region, city, experience_years, client").order("full_name");
      if (error) toast({ title: "Yüklenemedi", description: error.message, variant: "destructive" });
      setItems((data ?? []) as T[]);
      setLoading(false);
    })();
  }, []);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Teknisyenler</h1>
      {loading ? <p className="text-sm text-muted-foreground">Yükleniyor...</p> : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Bölgenizde kayıtlı teknisyen yok.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4">
                <div className="font-medium">{t.full_name}</div>
                <div className="text-xs text-muted-foreground">
                  {[t.region, t.city].filter(Boolean).join(" · ") || "—"}
                  {typeof t.experience_years === "number" ? ` · ${t.experience_years} yıl deneyim` : ""}
                </div>
                {t.client && <div className="text-xs text-muted-foreground mt-1">{t.client}</div>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Technicians;
