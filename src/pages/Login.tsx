import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";
import { Wrench } from "lucide-react";

const schema = z.object({
  email: z.string().trim().email("Geçerli bir e-posta girin").max(255),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı").max(72),
});

const Login = () => {
  const navigate = useNavigate();
  const { user, isManager, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate(isManager ? "/app/manager" : "/app/work-orders", { replace: true });
  }, [user, isManager, loading, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast({ title: "Hatalı bilgi", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
    setSubmitting(false);
    if (error) { toast({ title: "Giriş başarısız", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Hoş geldiniz" });
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Brand panel */}
      <aside className="hidden lg:flex flex-col justify-between p-12 w-1/2 surface-ink m-6 rounded-3xl">
        <div className="flex items-center gap-2 label-eyebrow text-ink-muted">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-2xl bg-ink-elevated text-primary border border-ink-border">
            <Wrench className="w-4 h-4" />
          </span>
          TOOLA · FIELD
        </div>
        <div>
          <h1 className="font-display text-5xl font-extrabold leading-tight text-ink-foreground">
            Sahanın <span className="text-primary">hafızası</span>.<br />Arızadan kanıtlı kapanışa.
          </h1>
          <p className="mt-6 text-ink-muted max-w-md">
            ToolA sahadan gelen arıza, müdahale, kanıt ve kapanış verilerini yapılandırılmış bakım hafızasına dönüştürür.
          </p>
        </div>
        <div className="flex gap-6 text-ink-muted text-sm">
          <Stat value="<60s" label="Kaynak referanslı cevap" />
          <Stat value="−%40" label="Gereksiz parça değişimi" />
          <Stat value="%30–50" label="Daha az duruş" />
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-ink text-primary shadow-ink">
              <Wrench className="w-4 h-4" />
            </span>
            <span className="font-display font-bold text-xl">Tool<span className="text-primary">A</span></span>
          </div>
          <h2 className="font-display text-3xl font-extrabold tracking-tight">Tekrar hoş geldiniz</h2>
          <p className="text-muted-foreground mt-1">Saha hafızanıza giriş yapın.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">E-posta</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required className="h-12 rounded-2xl bg-secondary border-0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">Şifre</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required className="h-12 rounded-2xl bg-secondary border-0" />
            </div>
            <Button type="submit" className="w-full h-12 rounded-full text-base font-semibold" disabled={submitting}>
              {submitting ? "Giriş yapılıyor…" : "Giriş yap"}
            </Button>
          </form>

          <div className="mt-6 flex flex-col items-center gap-2 text-sm">
            <Link to="/forgot-password" className="text-primary font-semibold hover:underline">Şifremi unuttum</Link>
            <div className="text-muted-foreground">
              Hesabınız yok mu?{" "}
              <Link to="/register" className="text-primary font-semibold hover:underline">Kayıt olun</Link>
            </div>
            <Link to="/" className="text-xs text-muted-foreground hover:underline mt-2">← Ana sayfaya dön</Link>
          </div>
        </div>
      </main>
    </div>
  );
};

const Stat = ({ value, label }: { value: string; label: string }) => (
  <div>
    <div className="font-display text-2xl font-bold text-ink-foreground">{value}</div>
    <div className="text-xs mt-1">{label}</div>
  </div>
);

export default Login;
