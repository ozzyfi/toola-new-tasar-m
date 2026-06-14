import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole = "admin" | "supervisor" | "technician";

export type Profile = {
  id: string;
  full_name: string | null;
  region: string | null;
  client: string | null;
  role: string | null;
  contribution_score: number | null;
  badge: string | null;
};

type AuthCtx = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  isManager: boolean; // supervisor or admin
  isAdmin: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProfileAndRoles = async (uid: string) => {
    const [{ data: prof }, { data: roleRows }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, region, client, role, contribution_score, badge")
        .eq("id", uid)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile((prof as Profile) ?? null);
    setRoles(((roleRows ?? []).map((r: any) => r.role)) as AppRole[]);
  };

  useEffect(() => {
    // Register listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        // defer to avoid deadlocks
        setTimeout(() => {
          loadProfileAndRoles(s.user.id).finally(() => setLoading(false));
        }, 0);
      } else {
        setProfile(null);
        setRoles([]);
        setLoading(false);
      }
    });

    // Then check existing session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadProfileAndRoles(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (user) await loadProfileAndRoles(user.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isAdmin = roles.includes("admin");
  const isManager = isAdmin || roles.includes("supervisor");

  return (
    <Ctx.Provider
      value={{ user, session, profile, roles, isManager, isAdmin, loading, refreshProfile, signOut }}
    >
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
};
