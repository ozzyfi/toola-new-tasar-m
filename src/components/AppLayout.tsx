import { ReactNode, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, LogOut, ClipboardList, PlusCircle, LayoutDashboard, Wrench, Users, Factory } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: ReactNode };

const TECH_NAV: NavItem[] = [
  { to: "/app/work-orders", label: "İş Emirlerim", icon: <ClipboardList className="w-4 h-4" /> },
  { to: "/app/work-orders/new", label: "Yeni Arıza Kaydı", icon: <PlusCircle className="w-4 h-4" /> },
];

const MANAGER_NAV: NavItem[] = [
  { to: "/app/manager", label: "Yönetici Paneli", icon: <LayoutDashboard className="w-4 h-4" /> },
  { to: "/app/work-orders", label: "İş Emirleri", icon: <Wrench className="w-4 h-4" /> },
  { to: "/app/machines", label: "Ekipmanlar", icon: <Factory className="w-4 h-4" /> },
  { to: "/app/technicians", label: "Teknisyenler", icon: <Users className="w-4 h-4" /> },
];

const RoleLabel = ({ isAdmin, isManager }: { isAdmin: boolean; isManager: boolean }) => {
  const label = isAdmin ? "Yönetici (admin)" : isManager ? "Yönetici" : "Teknisyen";
  return <span className="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground">{label}</span>;
};

const NavLinks = ({ items, onClick }: { items: NavItem[]; onClick?: () => void }) => (
  <nav className="flex flex-col gap-1">
    {items.map((it) => (
      <NavLink
        key={it.to}
        to={it.to}
        end={it.to === "/app/work-orders"}
        onClick={onClick}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
            isActive
              ? "bg-primary text-primary-foreground"
              : "hover:bg-accent hover:text-accent-foreground text-foreground/80",
          )
        }
      >
        {it.icon}
        {it.label}
      </NavLink>
    ))}
  </nav>
);

export const AppLayout = () => {
  const { profile, signOut, isManager, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const items = isManager ? MANAGER_NAV : TECH_NAV;

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <div className="mt-6">
                  <NavLinks items={items} onClick={() => setOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
            <NavLink to="/app/work-orders" className="font-semibold text-lg tracking-tight">
              Tool<span className="text-primary">A</span>
            </NavLink>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end leading-tight">
              <span className="text-sm font-medium">{profile?.full_name || "Kullanıcı"}</span>
              <div className="flex items-center gap-2">
                <RoleLabel isAdmin={isAdmin} isManager={isManager} />
                {profile?.region && (
                  <span className="text-xs text-muted-foreground">{profile.region}</span>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut} aria-label="Çıkış yap">
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Çıkış</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
        <aside className="hidden md:block">
          <NavLinks items={items} />
        </aside>
        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
