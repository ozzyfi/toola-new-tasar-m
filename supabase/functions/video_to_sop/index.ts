import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SOP_TOOL = {
  type: "function" as const,
  function: {
    name: "return_sop",
    description: "Adım adım SOP'u yapılandırılmış olarak döndür",
    parameters: {
      type: "object",
      properties: {
        summary: { type: "string", description: "Prosedürün kısa özeti" },
        steps: {
          type: "array",
          items: {
            type: "object",
            properties: {
              step: { type: "integer" },
              text: { type: "string" },
              time: { type: "integer", description: "Tahmini süre (dakika)" },
              confidence: { type: "integer", description: "60-95 arası" },
              safety_note: { type: "string", description: "Yoksa boş string" },
            },
            required: ["step", "text", "time", "confidence", "safety_note"],
            additionalProperties: false,
          },
        },
      },
      required: ["summary", "steps"],
      additionalProperties: false,
    },
  },
};

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

  let videoId: string | null = null;
  try {
    const body = await req.json();
    videoId = body.video_id;
    if (!videoId) return json(400, { error: "video_id zorunlu" });
    if (!LOVABLE_API_KEY) return json(500, { error: "LOVABLE_API_KEY tanımsız" });

    // 1) video kaydı
    const { data: vid, error: vErr } = await supabase
      .from("repair_videos")
      .select("id, wo_id, machine_id")
      .eq("id", videoId)
      .maybeSingle();

    if (vErr) return json(500, { error: vErr.message });
    if (!vid) return json(404, { error: "video bulunamadı" });

    // 2) iş emri
    let wo: any = null;
    if (vid.wo_id) {
      const { data, error } = await supabase
        .from("work_orders")
        .select("code, alarm_code, complaint, description, closing_notes")
        .eq("id", vid.wo_id)
        .maybeSingle();
      if (error) console.error("wo fetch err", error);
      wo = data;
    }

    // 3) makine
    let machine: any = null;
    if (vid.machine_id) {
      const { data, error } = await supabase
        .from("machines")
        .select("name, model, serial_no")
        .eq("id", vid.machine_id)
        .maybeSingle();
      if (error) console.error("machine fetch err", error);
      machine = data;
    }

    // 4) processing
    await supabase
      .from("repair_videos")
      .update({ status: "processing" })
      .eq("id", videoId);

    const machineName = machine?.name ?? "Belirtilmemiş";
    const machineModel = machine?.model ?? "—";
    const alarm = wo?.alarm_code ?? "Belirtilmemiş";
    const complaint = wo?.complaint ?? "Belirtilmemiş";
    const yapilan =
      (wo?.closing_notes && typeof wo.closing_notes === "object" && (wo.closing_notes as any).yapilan) ||
      "Belirtilmemiş";

    const systemPrompt = `Sen deneyimli bir endüstriyel bakım mühendisisin.
Aşağıdaki iş emri bilgilerine dayanarak adım adım bakım prosedürü (SOP) oluştur.

Makine: ${machineName} | Model: ${machineModel}
Alarm: ${alarm}
Şikayet: ${complaint}
Yapılan: ${yapilan}

Her adım için:
- Net ve uygulanabilir talimat
- Tahmini süre (dakika, integer)
- 60-95 arası güven skoru
- Güvenlik notu (yoksa boş string)

Türkçe yaz. SADECE return_sop tool'unu çağır.`;

    // 5) AI çağrısı
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
          { role: "system", content: systemPrompt },
          { role: "user", content: "Bu iş emri için adım adım SOP üret." },
        ],
        tools: [SOP_TOOL],
        tool_choice: { type: "function", function: { name: "return_sop" } },
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
      await supabase.from("repair_videos").update({ status: "failed" }).eq("id", videoId);
      return json(200, { error: msg });
    }

    const data = await aiResp.json();
    const argsStr = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!argsStr) {
      console.error("tool call yok", JSON.stringify(data).slice(0, 500));
      await supabase.from("repair_videos").update({ status: "failed" }).eq("id", videoId);
      return json(200, { error: "Tool call alınamadı" });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(argsStr);
    } catch (e) {
      console.error("parse err", e, argsStr);
      await supabase.from("repair_videos").update({ status: "failed" }).eq("id", videoId);
      return json(200, { error: "JSON parse hatası" });
    }

    // 6) güncelle
    const { error: upErr } = await supabase
      .from("repair_videos")
      .update({
        summary: parsed.summary ?? "",
        sop_steps: parsed.steps ?? [],
        status: "ready",
      })
      .eq("id", videoId);

    if (upErr) {
      console.error("update err", upErr);
      return json(500, { error: upErr.message });
    }

    return json(200, {
      video_id: videoId,
      status: "ready",
      summary: parsed.summary,
      steps: parsed.steps,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Bilinmeyen hata";
    console.error("video_to_sop fatal", e);
    if (videoId) {
      try {
        await supabase.from("repair_videos").update({ status: "failed" }).eq("id", videoId);
      } catch (_) {}
    }
    return json(500, { error: msg });
  }
});
