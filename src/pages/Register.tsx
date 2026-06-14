import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { REGION_OPTIONS } from "@/lib/workOrders";
import { z } from "zod";

const schema = z.object({
  full_name: z.string().trim().min(2, "Ad soyad en az 2 karakter").max(120),
  email: z.string().trim().email("Geçerli bir e-posta girin").max(255),
  password: z.string().min(6, "Şifre en az 6 karakter").max(72),
  region: z.string().min(1, "Bölge seçin"),
  client: z.string().trim().max(120).optional().or(z.literal("")),
});

const Register = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", region: "Marmara", client: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/app/work-orders", { replace: true });
  }, [user, loading, navigate]);

  const update = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Hatalı bilgi", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: { full_name: parsed.data.full_name },
      },
    });
    if (error) {
      setSubmitting(false);
      toast({ title: "Kayıt başarısız", description: error.message, variant: "destructive" });
      return;
    }
    // Update profile with region/client (trigger only sets full_name).
    if (data.user) {
      const { error: upErr } = await supabase
        .from("profiles")
        .update({
          full_name: parsed.data.full_name,
          region: parsed.data.region,
          client: parsed.data.client || null,
        })
        .eq("id", data.user.id);
      if (upErr) console.error("profile update failed", upErr);
    }
    setSubmitting(false);
    toast({
      title: "Kayıt oluşturuldu",
      description: data.session
        ? "Yönlendiriliyorsunuz..."
        : "E-postanızı doğruladıktan sonra giriş yapabilirsiniz.",
    });
    if (data.session) navigate("/app/work-orders", { replace: true });
    else navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-muted/30 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Hesap oluştur</CardTitle>
          <CardDescription>Sahanın hafızası — sahaya katılın.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Ad Soyad</Label>
              <Input id="full_name" value={form.full_name} onChange={(e) => update("full_name")(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => update("email")(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input id="password" type="password" value={form.password} onChange={(e) => update("password")(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Bölge</Label>
              <Select value={form.region} onValueChange={update("region")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REGION_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">İş emirleri ve ekipmanlar bölgenize göre filtrelenir.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="client">Müşteri / Kurum (opsiyonel)</Label>
              <Input id="client" value={form.client} onChange={(e) => update("client")(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Kayıt oluşturuluyor..." : "Kayıt ol"}
            </Button>
          </form>
          <div className="mt-4 text-sm text-center text-muted-foreground">
            Zaten hesabınız var mı?{" "}
            <Link to="/login" className="text-primary hover:underline">Giriş yapın</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
