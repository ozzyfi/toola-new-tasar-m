// Shared constants & helpers for ToolA work orders.
// We use Turkish status & priority codes; the existing schema stores them as text.

export const STATUS = {
  open: "acik",
  in_progress: "devam",
  waiting: "beklemede",
  closed: "kapali",
} as const;
export type StatusCode = typeof STATUS[keyof typeof STATUS];

export const STATUS_LABEL: Record<string, string> = {
  acik: "Açık",
  devam: "Devam Ediyor",
  beklemede: "Beklemede",
  kapali: "Kapalı",
};

export const STATUS_TONE: Record<string, string> = {
  acik: "bg-blue-100 text-blue-800 border-blue-200",
  devam: "bg-amber-100 text-amber-800 border-amber-200",
  beklemede: "bg-zinc-100 text-zinc-700 border-zinc-200",
  kapali: "bg-emerald-100 text-emerald-800 border-emerald-200",
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
  dusuk: "bg-zinc-100 text-zinc-700 border-zinc-200",
  orta: "bg-sky-100 text-sky-800 border-sky-200",
  yuksek: "bg-orange-100 text-orange-800 border-orange-200",
  kritik: "bg-red-100 text-red-800 border-red-200",
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
