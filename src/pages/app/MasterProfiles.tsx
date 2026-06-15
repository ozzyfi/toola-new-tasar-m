import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { GraduationCap, MapPin, Briefcase } from "lucide-react";
import { initials } from "@/lib/workOrders";

type Master = {
  id: string;
  name: string;
  region: string;
  city: string | null;
  experience_years: number | null;
  domain: string | null;
  work_md: string | null;
  persona_md: string | null;
  is_active: boolean | null;
  version: number | null;
};

const MasterProfiles = () => {
  const [items, setItems] = useState<Master[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Master | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("master_profiles")
        .select("*")
        .order("experience_years", { ascending: false })
        .limit(200);
      setItems((data ?? []) as Master[]);
      setLoading(false);
    })();
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Yönetici · Ustalar"
        title="Usta Profilleri"
        description="Saha ustalarının uzmanlık alanı, deneyimi ve persona dökümleri."
      />
      {loading ? (
        <p className="text-sm text-muted-foreground">Yükleniyor…</p>
      ) : items.length === 0 ? (
        <EmptyState icon={<GraduationCap className="w-5 h-5" />} title="Usta profili yok" />
      ) : (
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((m) => (
            <li key={m.id}>
              <button onClick={() => setOpen(m)} className="w-full text-left surface-card p-5 hover:shadow-float transition">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center">
                    {initials(m.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-display font-bold truncate">{m.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{m.domain ?? "—"}</div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="pill bg-secondary border border-border"><MapPin className="w-3 h-3" />{m.region}{m.city ? ` · ${m.city}` : ""}</span>
                  {m.experience_years != null && (
                    <span className="pill bg-secondary border border-border"><Briefcase className="w-3 h-3" />{m.experience_years} yıl</span>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle className="font-display">{open?.name}</SheetTitle>
            <SheetDescription>{open?.domain ?? "—"}</SheetDescription>
          </SheetHeader>
          {open && (
            <div className="mt-5 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Cell label="Bölge" value={`${open.region}${open.city ? ` · ${open.city}` : ""}`} />
                <Cell label="Deneyim" value={open.experience_years != null ? `${open.experience_years} yıl` : "—"} />
                <Cell label="Versiyon" value={String(open.version ?? "—")} />
                <Cell label="Aktif" value={open.is_active ? "Evet" : "Hayır"} />
              </div>
              {open.persona_md && (
                <div>
                  <div className="label-eyebrow mb-1">Persona</div>
                  <pre className="rounded-2xl bg-secondary p-3 text-xs whitespace-pre-wrap font-sans">{open.persona_md}</pre>
                </div>
              )}
              {open.work_md && (
                <div>
                  <div className="label-eyebrow mb-1">Çalışma notları</div>
                  <pre className="rounded-2xl bg-secondary p-3 text-xs whitespace-pre-wrap font-sans">{open.work_md}</pre>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

const Cell = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl bg-secondary p-3">
    <div className="label-eyebrow">{label}</div>
    <div className="font-semibold mt-0.5 truncate">{value}</div>
  </div>
);

export default MasterProfiles;
