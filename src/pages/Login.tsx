import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";

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
    if (!loading && user) {
      navigate(isManager ? "/app/manager" : "/app/work-orders", { replace: true });
    }
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
    if (error) {
      toast({ title: "Giriş başarısız", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Hoş geldiniz" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">
            Tool<span className="text-primary">A</span>'ya giriş
          </CardTitle>
          <CardDescription>Sahanın hafızası — devam etmek için giriş yapın.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Giriş yapılıyor..." : "Giriş yap"}
            </Button>
          </form>
          <div className="mt-4 flex flex-col gap-1 text-sm text-center">
            <Link to="/forgot-password" className="text-primary hover:underline">
              Şifremi unuttum
            </Link>
            <div className="text-muted-foreground">
              Hesabınız yok mu?{" "}
              <Link to="/register" className="text-primary hover:underline">
                Kayıt olun
              </Link>
            </div>
            <Link to="/" className="text-xs text-muted-foreground hover:underline mt-2">
              ← Ana sayfaya dön
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
