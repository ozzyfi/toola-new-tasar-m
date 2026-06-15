// Thin, typed wrappers around ToolA Supabase Edge Functions.
import { supabase } from "@/integrations/supabase/client";

export type DiagnoseStep = { num: number; text: string; source_ref: string; confidence: number };
export type DiagnoseResult = {
  type?: string;
  safety?: string;
  text?: string;
  steps?: DiagnoseStep[];
  top_cause?: string;
  alternatives?: string[];
  recommended_parts?: Array<{ name: string; part_no: string; stock: string; delivery: string }>;
  usta?: { ad: string; bolge: string; deneyim: string };
  error?: string;
};

export async function callDiagnose(payload: {
  question: string;
  region: string;
  mode?: "diagnosis" | "correction" | "info";
  wo_id?: string | null;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  corrections?: Array<{ scene_pattern: string; wrong: string; correct: string; lesson: string }>;
}) {
  const { data, error } = await supabase.functions.invoke("diagnose", {
    body: { mode: "diagnosis", history: [], corrections: [], ...payload },
  });
  if (error) throw error;
  return data as DiagnoseResult;
}

export async function callVideoToSop(video_id: string) {
  const { data, error } = await supabase.functions.invoke("video_to_sop", { body: { video_id } });
  if (error) throw error;
  return data as { ok?: boolean; summary?: string; steps?: any[]; error?: string };
}

export async function callLogAnalyzer(log_id: string) {
  const { data, error } = await supabase.functions.invoke("log_analyzer", { body: { log_id } });
  if (error) throw error;
  return data as {
    ok?: boolean;
    findings?: any[];
    recommendations?: any[];
    error?: string;
  };
}

export async function callGeneratePowReport(wo_id: string, user_id: string) {
  const { data, error } = await supabase.functions.invoke("generate_pow_report", {
    body: { wo_id, user_id },
  });
  if (error) throw error;
  return data as { success: boolean; report_url?: string; error?: string };
}

/** Resolve a private storage path to a short-lived signed URL. */
export async function signUrl(bucket: string, path: string, seconds = 3600): Promise<string | null> {
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, seconds);
  return data?.signedUrl ?? null;
}
