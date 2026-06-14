import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ANALYZE_TOOL = {
  type: "function" as const,
  function: {
    name: "return_analysis",
    description: "Log analizi sonucunu yapılandırılmış olarak döndür",
    parameters: {
      type: "object",
      properties: {
        findings: {
          type: "array",
          items: {
            type: "object",
            properties: {
              alarm: { type: "string" },
              count: { type: "integer" },
              first_seen: { type: "string" },
              last_seen: { type: "string" },
              severity: { type: "string", enum: ["critical", "warning", "info"] },
            },
            required: ["alarm", "count", "first_seen", "last_seen", "severity"],
            additionalProperties: false,
          },
        },
        recommendations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              action: { type: "string" },
              priority: { type: "string", enum: ["yüksek", "orta", "düşük"] },
              reason: { type: "string" },
            },
            required: ["action", "priority", "reason"],
            additionalProperties: false,
          },
        },
        recurring_match: {
          type: "object",
          properties: {
            pattern: { type: "string" },
            similar_cases_count: { type: "integer" },
            note: { type: "string" },
          },
          required: ["pattern", "similar_cases_count", "note"],
          additionalProperties: false,
        },
      },
      required: ["findings", "recommendations", "recurring_match"],
      additionalProperties: false,
    },
  },
};

const SYSTEM_PROMPT = `Sen endüstriyel bir makine log analiz uzmanısın. Verilen log dosyasını analiz et:
- Kritik alarm kodları ve ilk/son görülme zamanları
- Tekrarlayan hata örüntüleri (pattern)
- Kök nedene işaret eden veri noktaları
- Acil müdahale gerektiren durumlar

Türkçe yaz. SADECE return_analysis tool'unu çağır.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let logId: string | null = null;
  try {
    const body = await req.json();
    logId = body.log_id;
    if (!logId) return json(400, { error: "log_id zorunlu" });
    if (!LOVABLE_API_KEY) return json(500, { error: "LOVABLE_API_KEY tanımsız" });

    // 1) kaydı çek
    const { data: logRow, error: logErr } = await supabase
      .from("machine_logs")
      .select("id, storage_path, file_name")
      .eq("id", logId)
      .maybeSingle();

    if (logErr) {
      console.error("log fetch err", logErr);
      return json(500, { error: logErr.message });
    }
    if (!logRow) return json(404, { error: "log bulunamadı" });
    if (!logRow.storage_path) return json(400, { error: "storage_path yok" });

    // 3) processing
    await supabase.from("machine_logs").update({ status: "processing", error_msg: null }).eq("id", logId);

    // 2) dosyayı indir
    const { data: fileBlob, error: dlErr } = await supabase.storage
      .from("machine-logs")
      .download(logRow.storage_path);

    if (dlErr || !fileBlob) {
      const msg = dlErr?.message || "indirme başarısız";
      console.error("download err", dlErr);
      await supabase.from("machine_logs").update({ status: "failed", error_msg: msg }).eq("id", logId);
      return json(500, { error: msg });
    }

    let logText = await fileBlob.text();
    // Çok büyük dosyalarda ilk + son kısmı al (token bütçesi)
    const MAX = 60_000;
    if (logText.length > MAX) {
      logText =
        logText.slice(0, MAX / 2) +
        `\n\n... [${logText.length - MAX} karakter atlandı] ...\n\n` +
        logText.slice(-MAX / 2);
    }

    // 4) AI çağrısı
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        max_tokens: 1500,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Dosya: ${logRow.file_name ?? "(isimsiz)"}\n\n--- LOG ---\n${logText}` },
        ],
        tools: [ANALYZE_TOOL],
        tool_choice: { type: "function", function: { name: "return_analysis" } },
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("ai err", aiResp.status, txt);
      const msg =
        aiResp.status === 429
          ? "Rate limit aşıldı"
          : aiResp.status === 402
          ? "AI kredisi tükendi"
          : `AI hatası ${aiResp.status}`;
      await supabase.from("machine_logs").update({ status: "failed", error_msg: msg }).eq("id", logId);
      return json(200, { error: msg });
    }

    const data = await aiResp.json();
    const argsStr = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!argsStr) {
      const m = "Tool call alınamadı";
      console.error(m, JSON.stringify(data).slice(0, 500));
      await supabase.from("machine_logs").update({ status: "failed", error_msg: m }).eq("id", logId);
      return json(200, { error: m });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(argsStr);
    } catch (e) {
      const m = "JSON parse hatası";
      console.error(m, e, argsStr);
      await supabase.from("machine_logs").update({ status: "failed", error_msg: m }).eq("id", logId);
      return json(200, { error: m });
    }

    // 5) güncelle
    const { error: upErr } = await supabase
      .from("machine_logs")
      .update({
        findings: parsed.findings ?? [],
        recommendations: parsed.recommendations ?? [],
        recurring_match: parsed.recurring_match ?? {},
        status: "ready",
        error_msg: null,
      })
      .eq("id", logId);

    if (upErr) {
      console.error("update err", upErr);
      return json(500, { error: upErr.message });
    }

    return json(200, {
      log_id: logId,
      status: "ready",
      findings: parsed.findings,
      recommendations: parsed.recommendations,
      recurring_match: parsed.recurring_match,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Bilinmeyen hata";
    console.error("log_analyzer fatal", e);
    if (logId) {
      try {
        await supabase.from("machine_logs").update({ status: "failed", error_msg: msg }).eq("id", logId);
      } catch (_) {}
    }
    return json(500, { error: msg });
  }
});
