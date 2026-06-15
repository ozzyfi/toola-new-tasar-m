import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Bot, Plus, Save, ExternalLink } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { toast } from "@/hooks/use-toast";

type Session = {
  id: string;
  title: string | null;
  machine_name: string | null;
  status: string | null;
  wo_id: string | null;
  turns: any;
  created_at: string;
};

const DiagnosisHistory = () => {
  const { user, profile } = useAuth();
  const [items, setItems] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Session | null>(null);
  const [scene, setScene] = useState("");
  const [wrong, setWrong] = useState("");
  const [correct, setCorrect] = useState("");
  const [lesson, setLesson] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("diagnosis_sessions")
      .select("id, title, machine_name, status, wo_id, turns, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast({ title: "Yüklenemedi", description: error.message, variant: "destructive" });
    setItems((data ?? []) as Session[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const submitCorrection = async () => {
    if (!user || !open) return;
    if (!wrong.trim() || !correct.trim()) {
      toast({ title: "Eksik bilgi", description: "Yanlış ve doğru alanları zorunlu.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("corrections").insert({
      scene: scene || open.title || "tanı",
      wrong,
      correct,
      lesson: lesson || null,
      bolge: profile?.region ?? null,
      usta: profile?.full_name ?? null,
      wo_id: open.wo_id,
      created_by: user.id,
    });
    setSaving(false);
    if (error) { toast({ title: "Kaydedilemedi", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Düzeltme kaydedildi", description: "AI gelecekte bu dersi dikkate alacak." });
    setScene(""); setWrong(""); setCorrect(""); setLesson("");
  };

  return (
    <>
      <PageHeader
        eyebrow="AI Teşhis Geçmişi"
        title="Tanı Oturumları"
        description="Sahada alınmış AI önerilerinin geçmişi. Yanlış cevapları düzelt — sistem öğrenir."
      />
      {loading ? (
        <p className="text-sm text-muted-foreground">Yükleniyor…</p>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Bot className="w-5 h-5" />}
          title="Henüz tanı oturumu yok"
          description="Bir iş emrinin detayında 'ToolA Önerisi Al' butonu çağrıldığında bu listede görünür."
        />
      ) : (
        <ul className="space-y-3">
          {items.map((it) => {
            const turns = Array.isArray(it.turns) ? it.turns : [];
            const last = turns[turns.length - 1];
            const preview =
              typeof last?.content === "string"
                ? last.content
                : last?.content?.top_cause || last?.content?.text || "AI cevabı";
            return (
              <li key={it.id}>
                <button
                  onClick={() => setOpen(it)}
                  className="w-full text-left surface-card p-5 hover:shadow-float transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="label-eyebrow">{new Date(it.created_at).toLocaleString("tr-TR")}</div>
                      <div className="font-display font-bold mt-1 truncate">{it.title ?? "Tanı"}</div>
                      {it.machine_name && (
                        <div className="text-xs text-muted-foreground mt-0.5">{it.machine_name}</div>
                      )}
                    </div>
                    <span className="pill bg-secondary border border-border text-xs">{it.status ?? "—"}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{String(preview)}</p>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Sheet open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle className="font-display">{open?.title ?? "Tanı"}</SheetTitle>
            <SheetDescription>{open && new Date(open.created_at).toLocaleString("tr-TR")}</SheetDescription>
          </SheetHeader>

          {open && (
            <div className="mt-5 space-y-5 text-sm">
              {open.wo_id && (
                <Button asChild variant="outline" size="sm" className="rounded-full">
                  <Link to={`/app/work-orders/${open.wo_id}`}>
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> İş emrini aç
                  </Link>
                </Button>
              )}

              <div>
                <div className="label-eyebrow mb-2">AI cevabı</div>
                <pre className="rounded-2xl bg-secondary p-3 text-xs whitespace-pre-wrap font-mono max-h-72 overflow-auto">
{JSON.stringify(open.turns, null, 2)}
                </pre>
              </div>

              <div className="rounded-3xl bg-ink p-5 text-ink-foreground space-y-3">
                <div className="flex items-center gap-2 label-eyebrow text-ink-muted">
                  <Plus className="w-3.5 h-3.5" /> Düzeltme ekle
                </div>
                <Input
                  value={scene}
                  onChange={(e) => setScene(e.target.value)}
                  placeholder="Senaryo (örn: 'hidrolik basınç düşüklüğü')"
                  className="bg-ink-elevated border-ink-border text-ink-foreground placeholder:text-ink-muted"
                />
                <Textarea
                  value={wrong}
                  onChange={(e) => setWrong(e.target.value)}
                  placeholder="AI ne demişti? (yanlış)"
                  rows={2}
                  className="bg-ink-elevated border-ink-border text-ink-foreground placeholder:text-ink-muted resize-none"
                />
                <Textarea
                  value={correct}
                  onChange={(e) => setCorrect(e.target.value)}
                  placeholder="Doğrusu ne olmalıydı?"
                  rows={2}
                  className="bg-ink-elevated border-ink-border text-ink-foreground placeholder:text-ink-muted resize-none"
                />
                <Input
                  value={lesson}
                  onChange={(e) => setLesson(e.target.value)}
                  placeholder="Kısa ders (opsiyonel)"
                  className="bg-ink-elevated border-ink-border text-ink-foreground placeholder:text-ink-muted"
                />
                <Button onClick={submitCorrection} disabled={saving} className="rounded-full w-full">
                  <Save className="w-4 h-4 mr-2" /> Düzeltmeyi kaydet
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default DiagnosisHistory;
