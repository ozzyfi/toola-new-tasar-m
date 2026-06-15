import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Mic,
  Camera,
  Wrench,
  Brain,
  ShieldCheck,
  Activity,
  Sparkles,
  CheckCircle2,
  ClipboardList,
  Gauge,
  Search,
  Languages,
  ChevronRight,
} from "lucide-react";

type Lang = "tr" | "en";

const COPY = {
  tr: {
    nav: {
      how: "Nasıl Çalışır",
      tech: "Teknisyenler",
      mgr: "Yöneticiler",
      security: "Güvenlik",
      login: "Giriş",
      pilot: "Pilot Başlat",
    },
    hero: {
      eyebrow: "Sahanın hafızası · Teknisyenler ve yöneticiler için",
      title: "Sahanın hafızası.",
      titleAccent: "Arızadan kanıtlı kapanışa.",
      sub: "ToolA, sahadan gelen arıza, müdahale, kanıt ve kapanış verilerini yapılandırılmış bakım hafızasına dönüştürür. Böylece operasyonunuz görünür, sorgulanabilir ve AI-ready hale gelir.",
      cta: "Pilot Başlat",
      ctaAlt: "Nasıl Çalışır",
    },
    metrics: [
      { k: "<60s", v: "Kaynak referanslı cevap" },
      { k: "−%40", v: "Gereksiz parça değişimi" },
      { k: "%30–50", v: "Duruş azalması" },
    ],
    how: {
      title: "Nasıl Çalışır?",
      sub: "Dört adımda saha verisi, kurumsal hafızaya dönüşür.",
      steps: [
        { t: "Yakala", d: "Teknisyen sesle, fotoğrafla, video ve ölçümle arızayı kaydeder." },
        { t: "Anla", d: "ToolA, içeriği yapılandırır; benzer vakaları ve teknik dökümanları getirir." },
        { t: "Müdahale", d: "Kaynak referanslı, kısa adımlı çözüm önerisi; gerekli kanıtlar listelenir." },
        { t: "Kapat", d: "Kök sebep, yapılan iş ve kanıtla kapanış — yeni bir öğrenilmiş vaka oluşur." },
      ],
    },
    tech: {
      title: "Teknisyenler için",
      sub: "Sahada hızlı, ellerin doluyken bile çalışan bir asistan.",
      bullets: [
        { t: "Sesle iş emri", d: "Konuş, ToolA arıza kaydını yapısal forma çevirsin." },
        { t: "Kaynak referanslı cevap", d: "Benzer vakalar ve teknik dökümanlardan 60 sn altında öneri." },
        { t: "Kanıtlı kapanış", d: "Foto, ölçüm ve not olmadan iş kapanmaz; sahanın hafızası büyür." },
      ],
    },
    mgr: {
      title: "Yöneticiler için",
      sub: "Tekrar eden arızalar, eksik kanıtlar ve bölge performansı tek ekranda.",
      bullets: [
        { t: "Tekrar eden arızalar", d: "Hangi ekipman, hangi kök sebep, hangi sıklıkta — net görünür." },
        { t: "Kanıtsız kapanışlar", d: "Eksik foto/ölçüm/kök-sebep içeren iş emirlerini anında yakalayın." },
        { t: "Bölge & ekip görünürlüğü", d: "Aktif iş, yaklaşan bakım, katkı puanı — saha haritası gibi." },
      ],
    },
    security: {
      title: "Güvenlik & Veri",
      sub: "Saha verisi sizindir. Her şey, sizin kontrolünüzde.",
      bullets: [
        { t: "Rol bazlı erişim", d: "Tekniker, süpervizör ve admin için ayrı yetkiler ve RLS." },
        { t: "Bölgesel izolasyon", d: "Veriler bölge ve müşteri bazında satır seviyesinde korunur." },
        { t: "Kaynak referansı", d: "Her AI cevabı, döküman veya geçmiş vaka referansıyla gelir." },
      ],
    },
    cta: {
      title: "Pilotu bugün başlatın.",
      sub: "Sahanızdaki bir hat, bir bölge veya bir ekiple başlayın; 2 hafta içinde ölçülebilir sonuç.",
      btn: "Pilot Başlat",
      alt: "Giriş Yap",
    },
    footer: "© 2026 ToolA — Sahanın hafızası.",
  },
  en: {
    nav: {
      how: "How it works",
      tech: "Technicians",
      mgr: "Managers",
      security: "Security",
      login: "Sign in",
      pilot: "Start pilot",
    },
    hero: {
      eyebrow: "Field memory · For technicians and managers",
      title: "The memory of the field.",
      titleAccent: "From breakdown to evidence-backed closure.",
      sub: "ToolA turns field incidents, interventions, evidence and closures into a structured maintenance memory — making your operation visible, queryable and AI-ready.",
      cta: "Start pilot",
      ctaAlt: "How it works",
    },
    metrics: [
      { k: "<60s", v: "Source-cited answer" },
      { k: "−40%", v: "Unnecessary part swaps" },
      { k: "30–50%", v: "Downtime reduction" },
    ],
    how: {
      title: "How it works",
      sub: "Four steps to turn field data into operational memory.",
      steps: [
        { t: "Capture", d: "Technicians log faults with voice, photos, video and measurements." },
        { t: "Understand", d: "ToolA structures the content; surfaces similar cases and tech docs." },
        { t: "Act", d: "Short, source-cited steps; the required evidence is listed up front." },
        { t: "Close", d: "Root cause, action and evidence on closure — a new learned case is born." },
      ],
    },
    tech: {
      title: "For technicians",
      sub: "A fast assistant that works even when your hands are full.",
      bullets: [
        { t: "Voice work orders", d: "Speak — ToolA turns it into a structured work order." },
        { t: "Source-cited answers", d: "Recommendations from similar cases & docs in under 60s." },
        { t: "Evidence-backed closure", d: "No closure without photo, measurement or note — memory grows." },
      ],
    },
    mgr: {
      title: "For managers",
      sub: "Recurring failures, missing evidence and region performance — one screen.",
      bullets: [
        { t: "Recurring failures", d: "Which equipment, which root cause, which frequency — clearly." },
        { t: "Closures without evidence", d: "Catch work orders missing photos, measurements or root cause." },
        { t: "Region & team visibility", d: "Active work, upcoming maintenance, contribution score." },
      ],
    },
    security: {
      title: "Security & data",
      sub: "Your field data is yours. Everything stays under your control.",
      bullets: [
        { t: "Role-based access", d: "Separate permissions and RLS for technician, supervisor, admin." },
        { t: "Regional isolation", d: "Row-level isolation by region and customer." },
        { t: "Source citations", d: "Every AI answer ships with a doc or past-case reference." },
      ],
    },
    cta: {
      title: "Start your pilot today.",
      sub: "Begin with one line, one region or one crew — measurable results in 2 weeks.",
      btn: "Start pilot",
      alt: "Sign in",
    },
    footer: "© 2026 ToolA — The memory of the field.",
  },
} as const;

const HOW_ICONS = [Mic, Brain, Wrench, CheckCircle2];
const TECH_ICONS = [Mic, Search, Camera];
const MGR_ICONS = [Activity, ClipboardList, Gauge];
const SEC_ICONS = [ShieldCheck, ShieldCheck, Sparkles];

const Landing = () => {
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === "undefined") return "tr";
    return (localStorage.getItem("toola.lang") as Lang) || "tr";
  });
  const t = COPY[lang];

  useEffect(() => {
    localStorage.setItem("toola.lang", lang);
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    const prevTitle = document.title;
    document.title =
      lang === "tr"
        ? "ToolA — Sahanın hafızası. Arızadan kanıtlı kapanışa."
        : "ToolA — The memory of the field. Breakdown to evidence-backed closure.";
    return () => {
      document.title = prevTitle;
    };
  }, [lang]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <header className="sticky top-0 z-40 backdrop-blur bg-background/80 border-b border-border/60">
        <nav className="container flex items-center justify-between h-16">
          <a href="#top" className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-2xl bg-gradient-accent grid place-items-center text-primary-foreground font-display font-bold shadow-float">
              T
            </span>
            <span className="font-display font-bold text-lg tracking-tight">ToolA</span>
          </a>
          <div className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
            <a href="#how" className="hover:text-foreground transition">{t.nav.how}</a>
            <a href="#tech" className="hover:text-foreground transition">{t.nav.tech}</a>
            <a href="#mgr" className="hover:text-foreground transition">{t.nav.mgr}</a>
            <a href="#security" className="hover:text-foreground transition">{t.nav.security}</a>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === "tr" ? "en" : "tr")}
              className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-full border border-border bg-card text-xs font-semibold uppercase tracking-wider hover:bg-muted transition"
              aria-label="Toggle language"
            >
              <Languages className="h-3.5 w-3.5" />
              {lang === "tr" ? "TR" : "EN"}
            </button>
            <Link
              to="/login"
              className="hidden sm:inline-flex items-center h-9 px-3 rounded-full text-sm font-medium text-foreground hover:bg-muted transition"
            >
              {t.nav.login}
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-ink text-ink-foreground text-sm font-semibold shadow-ink hover:bg-ink-elevated transition"
            >
              {t.nav.pilot}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </nav>
      </header>

      {/* HERO */}
      <section id="top" className="container pt-12 pb-20 md:pt-20 md:pb-28">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 px-3 h-8 rounded-full bg-primary-soft text-accent-foreground text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" />
              {t.hero.eyebrow}
            </div>
            <h1 className="mt-6 font-display font-extrabold tracking-tight text-[2.6rem] leading-[1.05] sm:text-6xl lg:text-7xl">
              {t.hero.title}
              <br />
              <span className="text-primary">{t.hero.titleAccent}</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl">{t.hero.sub}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-primary text-primary-foreground font-semibold shadow-float hover:opacity-95 transition"
              >
                {t.hero.cta}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how"
                className="inline-flex items-center gap-2 h-12 px-6 rounded-full border border-border bg-card font-semibold hover:bg-muted transition"
              >
                {t.hero.ctaAlt}
                <ChevronRight className="h-4 w-4" />
              </a>
            </div>

            {/* metrics */}
            <div className="mt-12 grid grid-cols-3 gap-3 sm:gap-4 max-w-2xl">
              {t.metrics.map((m) => (
                <div
                  key={m.k}
                  className="rounded-3xl bg-card border border-border p-4 sm:p-5 shadow-card"
                >
                  <div className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-primary">
                    {m.k}
                  </div>
                  <div className="mt-1 text-xs sm:text-sm text-muted-foreground leading-snug">
                    {m.v}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero visual — premium ink card */}
          <div className="lg:col-span-5">
            <div className="relative">
              <div className="absolute -inset-6 bg-gradient-accent opacity-20 blur-3xl rounded-full" />
              <div className="relative rounded-[2rem] bg-gradient-ink p-6 sm:p-8 shadow-ink text-ink-foreground overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-ink-muted">
                    <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                    {lang === "tr" ? "Canlı saha" : "Live field"}
                  </div>
                  <div className="text-xs text-ink-muted">WO-4471</div>
                </div>
                <div className="mt-6">
                  <div className="text-xs uppercase tracking-wider text-ink-muted">
                    {lang === "tr" ? "Arıza" : "Fault"}
                  </div>
                  <div className="mt-1 font-display font-bold text-xl leading-snug">
                    {lang === "tr"
                      ? "Hidrolik basınç düşüklüğü — BSF 36-4.16H"
                      : "Low hydraulic pressure — BSF 36-4.16H"}
                  </div>
                </div>

                <div className="mt-6 rounded-2xl bg-ink-elevated border border-ink-border p-4">
                  <div className="flex items-center gap-2 text-xs text-ink-muted uppercase tracking-wider">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    {lang === "tr" ? "AI önerisi · 42 sn" : "AI suggestion · 42s"}
                  </div>
                  <ol className="mt-3 space-y-2 text-sm">
                    {[
                      lang === "tr" ? "Basınç regülasyon valfini kontrol et" : "Inspect pressure regulation valve",
                      lang === "tr" ? "Hidrolik yağ filtresini değiştir" : "Replace hydraulic oil filter",
                      lang === "tr" ? "Pompa girişinde sızıntı testi yap" : "Leak test at pump inlet",
                    ].map((step, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="mt-0.5 h-6 w-6 rounded-full bg-primary text-primary-foreground grid place-items-center text-[11px] font-bold">
                          {i + 1}
                        </span>
                        <span className="text-ink-foreground/90">{step}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/20">
                      {lang === "tr" ? "Kaynak: Vaka #2204" : "Source: Case #2204"}
                    </span>
                    <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white/5 text-ink-muted border border-ink-border">
                      {lang === "tr" ? "Doküman: HM-3.4" : "Doc: HM-3.4"}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[Mic, Camera, CheckCircle2].map((Icon, i) => (
                    <div
                      key={i}
                      className="rounded-2xl bg-ink-elevated border border-ink-border p-3 flex flex-col items-center gap-1.5 text-ink-muted"
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-[10px] uppercase tracking-wider">
                        {[
                          lang === "tr" ? "Ses" : "Voice",
                          lang === "tr" ? "Foto" : "Photo",
                          lang === "tr" ? "Kanıt" : "Evidence",
                        ][i]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="container py-20">
        <SectionHeader title={t.how.title} sub={t.how.sub} />
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {t.how.steps.map((s, i) => {
            const Icon = HOW_ICONS[i];
            return (
              <div
                key={s.t}
                className="relative rounded-3xl bg-card border border-border p-6 shadow-card hover:shadow-float transition"
              >
                <div className="flex items-center justify-between">
                  <div className="h-11 w-11 rounded-2xl bg-primary-soft grid place-items-center text-accent-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="font-display text-3xl font-extrabold text-muted-foreground/40">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-5 font-display text-lg font-bold">{s.t}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{s.d}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* TECHNICIANS */}
      <FeatureBlock
        id="tech"
        eyebrow={lang === "tr" ? "Saha ekipleri" : "Field teams"}
        title={t.tech.title}
        sub={t.tech.sub}
        items={t.tech.bullets}
        icons={TECH_ICONS}
        variant="light"
      />

      {/* MANAGERS — dark surface */}
      <FeatureBlock
        id="mgr"
        eyebrow={lang === "tr" ? "Operasyon yönetimi" : "Operations leadership"}
        title={t.mgr.title}
        sub={t.mgr.sub}
        items={t.mgr.bullets}
        icons={MGR_ICONS}
        variant="dark"
      />

      {/* SECURITY */}
      <FeatureBlock
        id="security"
        eyebrow={lang === "tr" ? "Kurumsal" : "Enterprise"}
        title={t.security.title}
        sub={t.security.sub}
        items={t.security.bullets}
        icons={SEC_ICONS}
        variant="light"
      />

      {/* CTA */}
      <section className="container py-20">
        <div className="relative overflow-hidden rounded-[2.25rem] bg-gradient-ink text-ink-foreground p-10 sm:p-14 shadow-ink">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/30 blur-3xl" />
          <div className="relative max-w-2xl">
            <h2 className="font-display font-extrabold text-3xl sm:text-5xl tracking-tight">
              {t.cta.title}
            </h2>
            <p className="mt-4 text-ink-muted text-lg">{t.cta.sub}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-primary text-primary-foreground font-semibold shadow-float hover:opacity-95 transition"
              >
                {t.cta.btn}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center h-12 px-6 rounded-full border border-ink-border bg-white/5 text-ink-foreground font-semibold hover:bg-white/10 transition"
              >
                {t.cta.alt}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="container py-8 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>{t.footer}</span>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hover:text-foreground transition">
              {t.nav.login}
            </Link>
            <Link to="/register" className="hover:text-foreground transition">
              {t.nav.pilot}
            </Link>
            <button
              onClick={() => setLang(lang === "tr" ? "en" : "tr")}
              className="inline-flex items-center gap-1 hover:text-foreground transition"
            >
              <Languages className="h-3.5 w-3.5" />
              {lang === "tr" ? "EN" : "TR"}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

const SectionHeader = ({ title, sub }: { title: string; sub: string }) => (
  <div className="max-w-2xl">
    <h2 className="font-display font-extrabold tracking-tight text-3xl sm:text-5xl">{title}</h2>
    <p className="mt-3 text-muted-foreground text-lg">{sub}</p>
  </div>
);

type FeatureItem = { t: string; d: string };

const FeatureBlock = ({
  id,
  eyebrow,
  title,
  sub,
  items,
  icons,
  variant,
}: {
  id: string;
  eyebrow: string;
  title: string;
  sub: string;
  items: readonly FeatureItem[];
  icons: readonly React.ComponentType<{ className?: string }>[];
  variant: "light" | "dark";
}) => {
  const dark = variant === "dark";
  return (
    <section id={id} className="container py-20">
      <div
        className={
          dark
            ? "relative overflow-hidden rounded-[2.25rem] bg-gradient-ink text-ink-foreground p-8 sm:p-14 shadow-ink"
            : "rounded-[2.25rem] bg-card border border-border p-8 sm:p-14 shadow-card"
        }
      >
        {dark && (
          <div className="absolute -left-24 -bottom-24 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
        )}
        <div className="relative grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5">
            <div
              className={
                "inline-flex items-center gap-2 px-3 h-8 rounded-full text-xs font-semibold uppercase tracking-wider " +
                (dark
                  ? "bg-white/10 text-ink-foreground border border-ink-border"
                  : "bg-primary-soft text-accent-foreground")
              }
            >
              {eyebrow}
            </div>
            <h2 className="mt-5 font-display font-extrabold tracking-tight text-3xl sm:text-5xl">
              {title}
            </h2>
            <p className={"mt-4 text-lg " + (dark ? "text-ink-muted" : "text-muted-foreground")}>
              {sub}
            </p>
          </div>
          <div className="lg:col-span-7 grid sm:grid-cols-1 gap-3">
            {items.map((it, i) => {
              const Icon = icons[i] ?? Sparkles;
              return (
                <div
                  key={it.t}
                  className={
                    "flex gap-4 rounded-2xl p-5 border " +
                    (dark
                      ? "bg-ink-elevated border-ink-border"
                      : "bg-background border-border")
                  }
                >
                  <div
                    className={
                      "h-11 w-11 shrink-0 rounded-2xl grid place-items-center " +
                      (dark
                        ? "bg-primary/15 text-primary border border-primary/25"
                        : "bg-primary-soft text-accent-foreground")
                    }
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-display font-bold">{it.t}</div>
                    <div
                      className={
                        "mt-1 text-sm leading-relaxed " +
                        (dark ? "text-ink-muted" : "text-muted-foreground")
                      }
                    >
                      {it.d}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Landing;
