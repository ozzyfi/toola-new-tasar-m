import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FIELD_LABELS: Record<string, string> = {
  ariza: "Arıza",
  neden: "Neden",
  yapilan: "Yapılan İşlem",
  sure: "Süre (dk)",
  yapilanBakim: "Yapılan Bakım",
  periyod: "Bakım Periyodu",
  notlar: "Notlar",
  parca: "Değiştirilen Parça",
  nedenDeg: "Neden Değiştirildi",
  parcaNo: "Parça No",
  islem: "İşlem",
  aciklama: "Açıklama",
  notlar2: "Notlar",
};

const fieldLabel = (k: string) => FIELD_LABELS[k] ?? k;

const esc = (v: unknown): string => {
  if (v === null || v === undefined || v === "") return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const fmtDate = (iso?: string | null) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
  } catch {
    return iso;
  }
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { wo_id, user_id } = await req.json();
    if (!wo_id || !user_id) return json(400, { success: false, error: "wo_id ve user_id zorunlu" });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1) work order
    const { data: wo, error: woErr } = await supabase
      .from("work_orders")
      .select("*")
      .eq("id", wo_id)
      .maybeSingle();
    if (woErr) return json(500, { success: false, error: woErr.message });
    if (!wo) return json(404, { success: false, error: "İş emri bulunamadı" });

    // 2) machine
    let machine: any = null;
    if (wo.machine_id) {
      const { data } = await supabase.from("machines").select("*").eq("id", wo.machine_id).maybeSingle();
      machine = data;
    }

    // 3) technician profile
    const { data: technician } = await supabase
      .from("profiles")
      .select("full_name, region, client")
      .eq("id", user_id)
      .maybeSingle();

    // 4) SOPs
    const { data: videos } = await supabase
      .from("repair_videos")
      .select("sop_steps")
      .eq("wo_id", wo_id)
      .eq("status", "ready");

    const sopSteps: any[] = [];
    for (const v of videos ?? []) {
      if (Array.isArray(v.sop_steps)) sopSteps.push(...v.sop_steps);
    }

    // 5) HTML
    const unix = Date.now();
    const reportId = `pow_${wo.code}_${unix}`;
    const timestamp = new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });

    const closingNotes =
      wo.closing_notes && typeof wo.closing_notes === "object" && !Array.isArray(wo.closing_notes)
        ? (wo.closing_notes as Record<string, unknown>)
        : {};

    const closingRows = Object.entries(closingNotes)
      .filter(([, v]) => v !== null && v !== undefined && v !== "")
      .map(
        ([k, v]) =>
          `<div class="row"><span class="label">${esc(fieldLabel(k))}</span><span class="value">${esc(v)}</span></div>`,
      )
      .join("");

    const sopBlock =
      sopSteps.length > 0
        ? `<h2>Uygulanan Prosedür (AI Destekli SOP)</h2>` +
          sopSteps
            .map(
              (s: any) =>
                `<div class="step-box"><span class="step-num">Adım ${esc(s.step)}.</span>${esc(s.text)}<span class="step-time">${esc(s.time)} dk</span></div>`,
            )
            .join("")
        : "";

    const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>Hizmet Kanıtı — ${esc(wo.code)}</title>
<style>
  body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;color:#1a1a1a;line-height:1.5}
  .header{border-bottom:3px solid #1B3A6B;padding-bottom:16px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:flex-end}
  .logo{font-size:22px;font-weight:700;color:#1B3A6B;letter-spacing:-0.5px}
  .logo span{color:#E87722}
  .report-no{font-size:12px;color:#888;text-align:right}
  .badge{display:inline-block;background:#E8F5E9;color:#1B5E20;padding:3px 12px;border-radius:20px;font-size:12px;font-weight:700;margin-left:8px}
  h2{font-size:16px;font-weight:700;color:#1B3A6B;border-bottom:1px solid #eee;padding-bottom:6px;margin:24px 0 12px}
  .row{display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px}
  .label{color:#666}
  .value{font-weight:500;text-align:right;max-width:60%}
  .step-box{background:#f8f9fa;border-left:3px solid #1B3A6B;padding:10px 14px;margin-bottom:8px;font-size:13px}
  .step-num{font-weight:700;color:#1B3A6B;margin-right:6px}
  .step-time{font-size:11px;color:#888;margin-left:8px}
  .seal{background:#1B3A6B;color:white;padding:14px 20px;border-radius:8px;text-align:center;margin:28px 0;font-size:12px}
  .seal strong{display:block;font-size:14px;margin-bottom:4px}
  .footer{border-top:1px solid #eee;padding-top:12px;font-size:11px;color:#999;text-align:center}
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="logo">Tool<span>A</span></div>
    <div style="font-size:15px;font-weight:600;margin-top:4px">
      Hizmet Kanıtı Raporu <span class="badge">DOĞRULANMIŞ</span>
    </div>
  </div>
  <div class="report-no">
    Rapor No: ${esc(reportId)}<br>
    Tarih: ${esc(timestamp)}
  </div>
</div>

<h2>İş Emri Bilgileri</h2>
<div class="row"><span class="label">İş Emri No</span><span class="value">${esc(wo.code)}</span></div>
<div class="row"><span class="label">Alarm Kodu</span><span class="value">${esc(wo.alarm_code) || "—"}</span></div>
<div class="row"><span class="label">Şikayet</span><span class="value">${esc(wo.complaint) || "—"}</span></div>
<div class="row"><span class="label">Kapatma Tarihi</span><span class="value">${esc(fmtDate(wo.closed_at))}</span></div>
<div class="row"><span class="label">Durum</span><span class="value" style="color:#1B5E20">Kapalı ✓</span></div>

<h2>Makine Bilgileri</h2>
<div class="row"><span class="label">Makine Adı</span><span class="value">${esc(machine?.name) || "—"}</span></div>
<div class="row"><span class="label">Model</span><span class="value">${esc(machine?.model) || "—"}</span></div>
<div class="row"><span class="label">Seri No</span><span class="value">${esc(machine?.serial_no) || "—"}</span></div>
<div class="row"><span class="label">Konum</span><span class="value">${esc(machine?.district) || "—"}, ${esc(machine?.city) || "—"}</span></div>

<h2>Teknisyen</h2>
<div class="row"><span class="label">Ad Soyad</span><span class="value">${esc(technician?.full_name) || "—"}</span></div>
<div class="row"><span class="label">Bölge</span><span class="value">${esc(technician?.region) || "—"}</span></div>
<div class="row"><span class="label">Müşteri</span><span class="value">${esc(technician?.client) || "—"}</span></div>

${closingRows ? `<h2>Yapılan İşlem</h2>${closingRows}` : ""}

${sopBlock}

<div class="seal">
  <strong>Dijital Damga</strong>
  Rapor ID: ${esc(reportId)} · Kullanıcı: ${esc(user_id)} · Zaman: ${unix} UTC
</div>

<div class="footer">
  ToolA · Sahanın Hafızası · toola.co<br>
  Bu rapor ToolA tarafından otomatik oluşturulmuştur.
  SAP/Maximo entegrasyonu için storage path kullanılabilir.
</div>
</body>
</html>`;

    // 6-7) upload
    const fileName = `pow_${wo.code}_${unix}.html`;
    const bytes = new TextEncoder().encode(html);

    const { error: upErr } = await supabase.storage
      .from("pow-reports")
      .upload(fileName, bytes, {
        contentType: "text/html; charset=utf-8",
        upsert: true,
      });
    if (upErr) {
      console.error("upload err", upErr);
      return json(500, { success: false, error: "Rapor yüklenemedi: " + upErr.message });
    }

    // 8) 1 yıl signed URL
    const { data: signed, error: sErr } = await supabase.storage
      .from("pow-reports")
      .createSignedUrl(fileName, 60 * 60 * 24 * 365);
    if (sErr || !signed?.signedUrl) {
      console.error("sign err", sErr);
      return json(500, { success: false, error: "Signed URL oluşturulamadı" });
    }

    // 9)
    return json(200, {
      success: true,
      report_url: signed.signedUrl,
      report_id: reportId,
      wo_code: wo.code,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Bilinmeyen hata";
    console.error("generate_pow_report fatal", e);
    return json(500, { success: false, error: msg });
  }
});
