import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Users as UsersIcon, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { initials } from "@/lib/workOrders";

type Row = {
  id: string;
  full_name: string | null;
  region: string | null;
  client: string | null;
  badge: string | null;
  contribution_score: number | null;
  role: AppRole;
};

const ROLES: AppRole[] = ["technician", "supervisor", "admin"];

const Users = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const [{ data: profs, error: pErr }, { data: roleRows, error: rErr }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, region, client, badge, contribution_score").limit(500),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    if (pErr || rErr) {
      toast({ title: "Yetki yok", description: (pErr ?? rErr)?.message ?? "", variant: "destructive" });
      setLoading(false); return;
    }
    const roleByUser = new Map<string, AppRole>();
    for (const r of roleRows ?? []) roleByUser.set((r as any).user_id, (r as any).role);
    const list: Row[] = (profs ?? []).map((p: any) => ({
      ...p,
      role: roleByUser.get(p.id) ?? "technician",
    }));
    setRows(list);
    setLoading(false);
  };
  useEffect(() => { if (isAdmin) load(); else setLoading(false); }, [isAdmin]);

  if (authLoading) return null;
  if (!isAdmin) return <Navigate to="/app/work-orders" replace />;

  const changeRole = async (userId: string, role: AppRole) => {
    setBusy(userId);
    const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (delErr) {
      setBusy(null);
      toast({ title: "Rol silinemedi", description: delErr.message, variant: "destructive" });
      return;
    }
    const { error: insErr } = await supabase.from("user_roles").insert({ user_id: userId, role });
    setBusy(null);
    if (insErr) { toast({ title: "Rol atanamadı", description: insErr.message, variant: "destructive" }); return; }
    toast({ title: "Rol güncellendi" });
    load();
  };

  return (
    <>
      <PageHeader
        eyebrow="Admin · Kullanıcılar"
        title="Kullanıcılar & Roller"
        description="Profilleri görüntüle ve rolleri (teknisyen / süpervizör / admin) düzenle."
      />
      {loading ? (
        <p className="text-sm text-muted-foreground">Yükleniyor…</p>
      ) : rows.length === 0 ? (
        <EmptyState icon={<UsersIcon className="w-5 h-5" />} title="Kullanıcı bulunamadı" />
      ) : (
        <ul className="space-y-3">
          {rows.map((u) => (
            <li key={u.id} className="surface-card p-5 flex flex-wrap items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center shrink-0">
                {initials(u.full_name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display font-bold truncate">{u.full_name ?? "—"}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {[u.region, u.client].filter(Boolean).join(" · ") || "—"}
                  {u.contribution_score != null && <> · katkı {u.contribution_score}</>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select value={u.role} onValueChange={(v) => changeRole(u.id, v as AppRole)} disabled={busy === u.id}>
                  <SelectTrigger className="w-40 h-10 rounded-full bg-secondary border-0"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
                {busy === u.id && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
};

export default Users;
