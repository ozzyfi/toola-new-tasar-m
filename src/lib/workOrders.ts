// Shared constants & helpers for ToolA work orders.
// Turkish status & priority codes; schema stores them as text.

export const STATUS = {
  open: "acik",
  in_progress: "devam",
  waiting: "beklemede",
  closed: "kapali",
} as const;
export type StatusCode = typeof STATUS[keyof typeof STATUS];

export const STATUS_LABEL: Record<string, string> = {
  acik: "Açık",
  devam: "Devam",
  beklemede: "Beklemede",
  kapali: "Kapalı",
};

/** Tailwind classes for status pills (semantic tokens). */
export const STATUS_TONE: Record<string, string> = {
  acik: "bg-primary/10 text-primary border-primary/20",
  devam: "bg-warning/15 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/25",
  beklemede: "bg-secondary text-foreground/70 border-border",
  kapali: "bg-success/12 text-[hsl(var(--success))] border-[hsl(var(--success))]/25",
};

export const PRIORITY = {
  low: "dusuk",
  medium: "orta",
  high: "yuksek",
  critical: "kritik",
} as const;

export const PRIORITY_LABEL: Record<string, string> = {
  dusuk: "Düşük",
  orta: "Orta",
  yuksek: "Yüksek",
  kritik: "Kritik",
};

export const PRIORITY_TONE: Record<string, string> = {
  dusuk: "bg-secondary text-foreground/70 border-border",
  orta: "bg-secondary text-foreground/80 border-border",
  yuksek: "bg-primary/12 text-primary border-primary/25",
  kritik: "bg-destructive/12 text-destructive border-destructive/25",
};

/** Small colored dot inside a pill (status / priority dot). */
export const STATUS_DOT: Record<string, string> = {
  acik: "bg-primary",
  devam: "bg-[hsl(var(--warning))]",
  beklemede: "bg-muted-foreground",
  kapali: "bg-[hsl(var(--success))]",
};
export const PRIORITY_DOT: Record<string, string> = {
  dusuk: "bg-muted-foreground",
  orta: "bg-foreground/60",
  yuksek: "bg-primary",
  kritik: "bg-destructive",
};

export const REGION_OPTIONS = ["Marmara", "İç Anadolu", "Ege", "Akdeniz", "Karadeniz", "Doğu Anadolu", "Güneydoğu Anadolu"];

export type ClosingNotes = {
  observation?: string;
  root_cause?: string;
  action_taken?: string;
  parts_used?: string;
  measurement?: string;
  follow_up_required?: boolean;
  closure_note?: string;
  incomplete_reason?: string;
};

export function generateWoCode() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `WO-${ymd}-${rand}`;
}

export function hasEvidence(wo: { evidence_photo_urls?: any }) {
  const v = wo?.evidence_photo_urls;
  return Array.isArray(v) && v.length > 0;
}

export function isQualityClosure(wo: { status?: string | null; closing_notes?: any; evidence_photo_urls?: any }) {
  if (wo.status !== STATUS.closed) return false;
  const c = (wo.closing_notes ?? {}) as ClosingNotes;
  return Boolean(c.root_cause && c.action_taken && hasEvidence(wo));
}

/** Initials helper for avatars (e.g. "Mehmet K." -> "MK"). */
export function initials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}
