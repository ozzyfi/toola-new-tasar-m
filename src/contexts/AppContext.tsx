import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppState = {
  userId: string;
  fullName: string;
  region: string; // 'Marmara' | 'İç Anadolu' | 'Ege'
  role: string; // 'technician' | 'supervisor'
  client: string;
  contributionScore: number;
  badge: string;
  isDemo: boolean;
};

const defaultDemo: AppState = {
  userId: "demo-user",
  fullName: "Mehmet Yılmaz",
  region: "Marmara",
  role: "technician",
  client: "BEDAŞ",
  contributionScore: 145,
  badge: "deneyimli",
  isDemo: true,
};

type AppContextValue = {
  appState: AppState;
  loading: boolean;
  refresh: () => Promise<void>;
  patch: (p: Partial<AppState>) => void;
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [appState, setAppState] = useState<AppState>(defaultDemo);
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;

      if (!session?.user) {
        setAppState(defaultDemo);
        console.log("APP State:", defaultDemo);
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("full_name, region, role, client, contribution_score, badge")
        .eq("id", session.user.id)
        .maybeSingle();

      if (error || !profile) {
        const fallback = { ...defaultDemo, userId: session.user.id, isDemo: false };
        setAppState(fallback);
        console.log("APP State:", fallback);
        return;
      }

      const next: AppState = {
        userId: session.user.id,
        fullName: profile.full_name ?? "",
        region: profile.region ?? "Marmara",
        role: profile.role ?? "technician",
        client: profile.client ?? "",
        contributionScore: (profile as any).contribution_score ?? 0,
        badge: (profile as any).badge ?? "yeni",
        isDemo: false,
      };
      setAppState(next);
      console.log("APP State:", next);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      loadProfile();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <AppContext.Provider
      value={{
        appState,
        loading,
        refresh: loadProfile,
        patch: (p) => setAppState((prev) => ({ ...prev, ...p })),
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};
