import { ReactNode, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Bell,
  LogOut,
  ClipboardList,
  PlusCircle,
  LayoutDashboard,
  Factory,
  Users,
  Wrench,
  BookOpen,
  Bot,
  Film,
  FileBarChart,
  FileText,
  GraduationCap,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/workOrders";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavItem = { to: string; label: string; icon: ReactNode; end?: boolean };

const TECH_BOTTOM: NavItem[] = [
  { to: "/app/work-orders", label: "Görevler", icon: <ClipboardList className="w-5 h-5" />, end: true },
  { to: "/app/work-orders/new", label: "Yeni", icon: <PlusCircle className="w-5 h-5" /> },
  { to: "/app/memory", label: "Hafıza", icon: <BookOpen className="w-5 h-5" /> },
  { to: "/app/diagnosis", label: "Teşhis", icon: <Bot className="w-5 h-5" /> },
];

const MANAGER_BOTTOM: NavItem[] = [
  { to: "/app/manager", label: "Panel", icon: <LayoutDashboard className="w-5 h-5" /> },
  { to: "/app/work-orders", label: "Görevler", icon: <ClipboardList className="w-5 h-5" />, end: true },
  { to: "/app/memory", label: "Hafıza", icon: <BookOpen className="w-5 h-5" /> },
  { to: "/app/machines", label: "Ekipman", icon: <Factory className="w-5 h-5" /> },
];

const TECH_MORE: NavItem[] = [
  { to: "/app/sop", label: "Video → SOP", icon: <Film className="w-4 h-4" /> },
  { to: "/app/logs", label: "Log Analizi", icon: <FileBarChart className="w-4 h-4" /> },
];

const MANAGER_MORE: NavItem[] = [
  { to: "/app/work-orders/new", label: "Yeni İş Emri", icon: <PlusCircle className="w-4 h-4" /> },
  { to: "/app/diagnosis", label: "AI Teşhis", icon: <Bot className="w-4 h-4" /> },
  { to: "/app/sop", label: "Video → SOP", icon: <Film className="w-4 h-4" /> },
  { to: "/app/logs", label: "Log Analizi", icon: <FileBarChart className="w-4 h-4" /> },
  { to: "/app/technicians", label: "Ekip", icon: <Users className="w-4 h-4" /> },
  { to: "/app/manager/reports", label: "PoW Raporları", icon: <FileText className="w-4 h-4" /> },
  { to: "/app/manager/masters", label: "Usta Profilleri", icon: <GraduationCap className="w-4 h-4" /> },
];

const ADMIN_EXTRA: NavItem = { to: "/app/manager/users", label: "Kullanıcılar", icon: <Users className="w-4 h-4" /> };

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "İyi geceler";
  if (h < 12) return "Günaydın";
  if (h < 18) return "İyi günler";
  return "İyi akşamlar";
}

function pageTitle(pathname: string, isManager: boolean): string {
  if (pathname.startsWith("/app/work-orders/new")) return "Yeni Kayıt";
  if (pathname.startsWith("/app/work-orders/")) return "İş Emri";
  if (pathname.startsWith("/app/work-orders")) return "Görevler";
  if (pathname.startsWith("/app/manager/reports")) return "PoW Raporları";
  if (pathname.startsWith("/app/manager/masters")) return "Ustalar";
  if (pathname.startsWith("/app/manager/users")) return "Kullanıcılar";
  if (pathname.startsWith("/app/manager")) return "Operasyon";
  if (pathname.startsWith("/app/machines")) return "Ekipmanlar";
  if (pathname.startsWith("/app/technicians")) return "Saha Ekibi";
  if (pathname.startsWith("/app/memory")) return "Sahanın Hafızası";
  if (pathname.startsWith("/app/diagnosis")) return "AI Teşhis";
  if (pathname.startsWith("/app/sop")) return "Video → SOP";
  if (pathname.startsWith("/app/logs")) return "Log Analizi";
  return isManager ? "Operasyon" : "Görevler";
}

const RolePill = ({ isAdmin, isManager }: { isAdmin: boolean; isManager: boolean }) => {
  const label = isAdmin ? "Admin" : isManager ? "Yönetici" : "Teknisyen";
  return (
    <span className="pill bg-secondary text-foreground/70 border border-border">
      <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--success))]" /> {label}
    </span>
  );
};

const DesktopSideNav = ({ items }: { items: NavItem[] }) => (
  <nav className="flex flex-col gap-1 p-2">
    {items.map((it) => (
      <NavLink
        key={it.to}
        to={it.to}
        end={it.end}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all",
            isActive
              ? "bg-ink text-ink-foreground shadow-ink"
              : "text-foreground/70 hover:bg-secondary hover:text-foreground",
          )
        }
      >
        <span className="opacity-90">{it.icon}</span>
        {it.label}
      </NavLink>
    ))}
  </nav>
);

const MobileBottomNav = ({ items }: { items: NavItem[] }) => (
  <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 bottom-nav-safe px-4 pointer-events-none">
    <nav
      className="pointer-events-auto mx-auto max-w-md flex items-center justify-between gap-1 rounded-full bg-ink text-ink-foreground p-1.5 shadow-float border border-ink-border"
    >
      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.end}
          className={({ isActive }) =>
            cn(
              "relative flex-1 flex items-center justify-center gap-2 rounded-full h-12 text-sm font-semibold transition-all",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-ink-foreground/70 hover:text-ink-foreground",
            )
          }
          aria-label={it.label}
        >
          {({ isActive }) => (
            <>
              {it.icon}
              {isActive && <span>{it.label}</span>}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  </div>
);

export const AppLayout = () => {
  const { profile, signOut, isManager, isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const bottom = isManager ? MANAGER_BOTTOM : TECH_BOTTOM;
  const more = [
    ...(isManager ? MANAGER_MORE : TECH_MORE),
    ...(isAdmin ? [ADMIN_EXTRA] : []),
  ];
  const desktopAll: NavItem[] = [...bottom, ...more];
  const [openNotif, setOpenNotif] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const name = profile?.full_name || user?.email?.split("@")[0] || "Kullanıcı";
  const title = pageTitle(location.pathname, isManager);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b border-border/60">
        <div className="container mx-auto px-5 lg:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <NavLink to="/app/work-orders" className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-2xl bg-ink text-primary shadow-ink">
                <Wrench className="w-4 h-4" />
              </span>
              <span className="font-display font-bold text-lg tracking-tight hidden sm:inline">
                Tool<span className="text-primary">A</span>
              </span>
            </NavLink>
            <span className="hidden md:inline-block label-eyebrow ml-2">{title}</span>
          </div>

          <div className="md:hidden label-eyebrow">TOOLA · FIELD</div>

          <div className="flex items-center gap-2">
            {/* "Daha fazla" menu — always visible */}
            {more.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full bg-secondary hover:bg-muted w-10 h-10" aria-label="Daha fazla">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60 rounded-2xl">
                  <DropdownMenuLabel className="label-eyebrow">Tüm bölümler</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {more.map((it) => (
                    <DropdownMenuItem key={it.to} onClick={() => navigate(it.to)} className="cursor-pointer">
                      <span className="mr-2 text-muted-foreground">{it.icon}</span>{it.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-secondary hover:bg-muted w-10 h-10 hidden sm:inline-flex"
              onClick={() => setOpenNotif((v) => !v)}
              aria-label="Bildirimler"
            >
              <Bell className="w-4 h-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="Hesap"
                  className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center shadow-card hover:opacity-90 transition"
                >
                  {initials(name)}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 rounded-2xl">
                <DropdownMenuLabel className="space-y-1">
                  <div className="font-semibold">{name}</div>
                  <div className="flex items-center gap-2">
                    <RolePill isAdmin={isAdmin} isManager={isManager} />
                    {profile?.region && (
                      <span className="text-xs text-muted-foreground">{profile.region}</span>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" /> Çıkış yap
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {openNotif && (
          <div className="container mx-auto px-5 lg:px-8 pb-3">
            <div className="surface-card p-4 text-sm text-muted-foreground animate-fade-in">
              Şu anda yeni bildirim yok.
            </div>
          </div>
        )}
      </header>

      <div className="container mx-auto px-5 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 lg:gap-8 pb-32 lg:pb-10">
        <aside className="hidden lg:block">
          <div className="surface-card sticky top-24 p-2">
            <div className="px-3 pt-2 pb-3">
              <div className="label-eyebrow">Menü</div>
            </div>
            <DesktopSideNav items={desktopAll} />
            <div className="px-3 pt-3 pb-2 border-t border-border/60 mt-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center">
                  {initials(name)}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{name}</div>
                  <div className="text-xs text-muted-foreground truncate">{profile?.region ?? "—"}</div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          <div className="mb-6 flex items-end justify-between gap-3">
            <div>
              <div className="text-sm text-muted-foreground">{greeting()},</div>
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                {name.split(" ")[0]}
                {name.split(" ")[1] ? ` ${name.split(" ")[1][0]}.` : ""}
              </h1>
            </div>
          </div>

          <Outlet />
        </main>
      </div>

      <MobileBottomNav items={bottom} />
    </div>
  );
};

export default AppLayout;
