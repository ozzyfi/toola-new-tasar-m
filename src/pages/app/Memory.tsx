import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, BookOpen, MapPin, Factory, CheckCircle2, XCircle } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

type LC = {
  id: string;
  alarm: string | null;
  diagnosis: string | null;
  success: boolean | null;
  usta: string | null;
  bolge: string | null;
  month: string | null;
  machine_id: string | null;
  wo_id: string | null;
  created_at: string;
  discovered_by_name: string | null;
};

const Memory = () => {
  const [items, setItems] = useState<LC[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "success" | "failed">("all");
  const [open, setOpen] = useState<LC | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("learning_cases")
        .select("id, alarm, diagnosis, success, usta, bolge, month, machine_id, wo_id, created_at, discovered_by_name")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) toast({ title: "Yüklenemedi", description: error.message, variant: "destructive" });
      setItems((data ?? []) as LC[]);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const ql = q.trim().toLocaleLowerCase("tr");
    return items.filter((it) => {
      if (filter === "success" && it.success !== true) return false;
      if (filter === "failed" && it.success !== false) return false;
      if (!ql) return true;
      return [it.alarm, it.diagnosis, it.usta, it.bolge]
        .filter(Boolean)
        .some((v) => String(v).toLocaleLowerCase("tr").includes(ql));
    });
  }, [items, q, filter]);

  return (
    <>
      <PageHeader
        eyebrow="Sahanın Hafızası"
        title="Öğrenilmiş Vakalar"
        description="Kanıtlı kapanışlardan üretilen, tekrar kullanılabilir saha bilgisi."
      />

      <div className="surface-ink p-5 mb-5 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Alarm, kök neden, usta veya bölge ara…"
            className="h-12 pl-11 rounded-full bg-ink-elevated border-ink-border text-ink-foreground placeholder:text-ink-muted"
          />
        </div>
        <div className="flex items-center gap-1 bg-ink-elevated border border-ink-border rounded-full p-1">
          {[
            { k: "all", l: "Tümü" },
            { k: "success", l: "Başarılı" },
            { k: "failed", l: "Başarısız" },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setFilter(t.k as any)}
              className={cn(
                "px-4 h-9 rounded-full text-sm font-semibold transition",
                filter === t.k ? "bg-primary text-primary-foreground" : "text-ink-muted hover:text-ink-foreground",
              )}
            >
              {t.l}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Yükleniyor…</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-5 h-5" />}
          title="Vaka bulunamadı"
          description="Kapanışlar 'Kök neden + yapılan işlem + kanıt' ile tamamlandığında bu listeye eklenir."
        />
      ) : (
        <ul className="grid sm:grid-cols-2 gap-3">
          {filtered.map((it) => (
            <li key={it.id}>
              <button
                onClick={() => setOpen(it)}
                className="w-full text-left surface-card p-5 hover:shadow-float transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="label-eyebrow">{new Date(it.created_at).toLocaleDateString("tr-TR")}</div>
                    <div className="font-display font-bold mt-1 truncate">{it.alarm ?? "—"}</div>
                  </div>
                  <span
                    className={cn(
                      "pill border",
                      it.success === false
                        ? "bg-destructive/10 text-destructive border-destructive/25"
                        : "bg-success/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/25",
                    )}
                  >
                    {it.success === false ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                    {it.success === false ? "Başarısız" : "Başarılı"}
                  </span>
                </div>
                {it.diagnosis && (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{it.diagnosis}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {it.usta && <span className="pill bg-secondary border border-border"><Factory className="w-3 h-3" />{it.usta}</span>}
                  {it.bolge && <span className="pill bg-secondary border border-border"><MapPin className="w-3 h-3" />{it.bolge}</span>}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="font-display">{open?.alarm ?? "Vaka"}</SheetTitle>
            <SheetDescription>
              {open && new Date(open.created_at).toLocaleString("tr-TR")}
            </SheetDescription>
          </SheetHeader>
          {open && (
            <div className="mt-5 space-y-4 text-sm">
              <Section label="Kök neden / Çözüm">
                <p className="whitespace-pre-line">{open.diagnosis || "—"}</p>
              </Section>
              <div className="grid grid-cols-2 gap-3">
                <Cell label="Usta" value={open.usta ?? open.discovered_by_name ?? "—"} />
                <Cell label="Bölge" value={open.bolge ?? "—"} />
                <Cell label="Ay" value={open.month ?? "—"} />
                <Cell label="Sonuç" value={open.success === false ? "Başarısız" : "Başarılı"} />
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <div className="label-eyebrow mb-1">{label}</div>
    <div className="rounded-2xl bg-secondary p-3">{children}</div>
  </div>
);
const Cell = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl bg-secondary p-3">
    <div className="label-eyebrow">{label}</div>
    <div className="font-semibold mt-0.5 truncate">{value}</div>
  </div>
);

export default Memory;
