import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Mode = "diagnosis" | "correction" | "info";

interface CorrectionItem {
  scene_pattern: string;
  wrong: string;
  correct: string;
  lesson: string;
}

interface HistoryMsg {
  role: "user" | "assistant";
  content: string;
}

interface EvidenceImage {
  base64: string;
  media_type: string;
  type: "photo" | "thermal" | "label" | string;
}

interface ReqBody {
  question: string;
  images?: EvidenceImage[];
  image_base64?: string | null;
  image_media_type?: string | null;
  region: string;
  corrections?: CorrectionItem[];
  history?: HistoryMsg[];
  mode: Mode;
  wo_id?: string | null;
}

// ---- Tool schemas (mode bazlı garantili JSON) ----

const DIAGNOSIS_TOOL = {
  type: "function" as const,
  function: {
    name: "return_diagnosis",
    description: "Teşhis cevabını yapılandırılmış olarak döndür",
    parameters: {
      type: "object",
      properties: {
        safety: { type: "string", description: "Güvenlik uyarısı (LOTO vb.)" },
        text: { type: "string", description: "Usta ağzından açıklama" },
        steps: {
          type: "array",
          items: {
            type: "object",
            properties: {
              num: { type: "integer" },
              text: { type: "string" },
              source_ref: { type: "string", description: "'Kılavuz/sf.X' veya 'Saha Verisi'" },
              confidence: { type: "integer", description: "60-95 arası" },
            },
            required: ["num", "text", "source_ref", "confidence"],
            additionalProperties: false,
          },
        },
        top_cause: { type: "string" },
        alternatives: { type: "array", items: { type: "string" } },
        recommended_parts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              part_no: { type: "string" },
              stock: { type: "string" },
              delivery: { type: "string" },
            },
            required: ["name", "part_no", "stock", "delivery"],
            additionalProperties: false,
          },
        },
      },
      required: ["safety", "text", "steps", "top_cause", "alternatives", "recommended_parts"],
      additionalProperties: false,
    },
  },
};

const CORRECTION_TOOL = {
  type: "function" as const,
  function: {
    name: "return_correction_learned",
    description: "Teknisyenin düzeltmesinden öğrenilen kuralı kaydet",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "Kısa kabul mesajı" },
        lesson: { type: "string", description: "Öğrenilen kuralın kısa özeti" },
        scene: { type: "string", description: "Senaryo tanımı (pattern olarak kullanılacak)" },
        wrong: { type: "string", description: "Önceki yanlış teşhis/çözüm" },
        correct: { type: "string", description: "Doğru teşhis/çözüm" },
      },
      required: ["text", "lesson", "scene", "wrong", "correct"],
      additionalProperties: false,
    },
  },
};

const INFO_TOOL = {
  type: "function" as const,
  function: {
    name: "return_info",
    description: "Teknik bilgi cevabı döndür",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string" },
        source_ref: { type: "string", description: "'Kılavuz/sf.X' veya 'Saha Verisi'" },
      },
      required: ["text", "source_ref"],
      additionalProperties: false,
    },
  },
};

function pickTool(mode: Mode) {
  if (mode === "correction") return CORRECTION_TOOL;
  if (mode === "info") return INFO_TOOL;
  return DIAGNOSIS_TOOL;
}

function buildSystemPrompt(opts: {
  ustaName: string;
  persona: string;
  work: string;
  correctionBlock: string;
  mode: Mode;
  hasImage: boolean;
  imageCount?: number;
}) {
  const parts: string[] = [];
  parts.push(`Sen ${opts.ustaName} adlı deneyimli bir endüstriyel bakım ustasısın.`);
  if (opts.persona) parts.push(opts.persona);
  if (opts.work) parts.push(`TEKNİK BİLGİ TABANIN:\n${opts.work}`);
  if (opts.correctionBlock) parts.push(opts.correctionBlock);

  parts.push(
    [
      "ÇIKTI KURALLARI:",
      "- Cevabını SADECE verilen tool çağrısı ile dön. Düz metin yazma.",
      "- 'text' alanında ustanın kendi ağzından, sıcak ve teknik konuş.",
      "- Her adım için gerçekçi güven skoru (60-95 arası).",
      "- source_ref için 'Kılavuz/sf.X' veya 'Saha Verisi' yaz.",
      "- recommended_parts için makul mock veri üret (gerçek stok yok).",
      "- Türkçe yaz. Asla uydurma; bilmiyorsan dürüstçe söyle.",
    ].join("\n"),
  );

  if (opts.mode === "correction") {
    parts.push(
      "Teknisyen önceki teşhisin yanlış olduğunu söylüyor. Hatadan öğren ve return_correction_learned tool'unu çağır.",
    );
  }
  if (opts.hasImage) {
    const count = opts.imageCount || 1;
    if (count === 1) {
      parts.push("Teknisyen bir fotoğraf/görsel paylaştı. Görseli analiz ederek teşhise dahil et. Görselde gördüklerini kısaca açıkla.");
    } else {
      parts.push(`Teknisyen ${count} adet görsel paylaştı (fotoğraf, termal, etiket vb.). Tüm görselleri birlikte analiz et, her görselden ne anladığını kısaca belirt ve teşhise dahil et.`);
    }
  }
  return parts.join("\n\n");
}

function buildCorrectionBlock(items: CorrectionItem[]): string {
  if (!items?.length) return "";
  const body = items
    .map(
      (c) =>
        `Senaryo: ${c.scene_pattern}\nYanlış: ${c.wrong}\nDoğru: ${c.correct}\nKural: ${c.lesson}`,
    )
    .join("\n\n");
  return `ÖNEMLİ — GEÇMIŞ HATALAR VE DOĞRU ÇÖZÜMLER:\n${body}\n\nSoru bu senaryolardan birine benziyorsa, kesinlikle Doğru yanıtı kullan.`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const body = (await req.json()) as ReqBody;
    const {
      question,
      images = [],
      image_base64,
      image_media_type,
      region,
      corrections = [],
      history = [],
      mode,
      wo_id,
    } = body;

    // images array varsa kullan, yoksa eski tekil image_base64'e düş
    const allImages: EvidenceImage[] = images.length > 0
      ? images
      : (image_base64 ? [{ base64: image_base64, media_type: image_media_type || "image/jpeg", type: "photo" }] : []);

    if (!question || !region || !mode) {
      return json(200, { type: "raw", text: "question, region, mode zorunlu", error: "bad_request" });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Eksik env:", { LOVABLE_API_KEY: !!LOVABLE_API_KEY, SUPABASE_URL: !!SUPABASE_URL, SRK: !!SUPABASE_SERVICE_ROLE_KEY });
      return json(200, { type: "raw", text: "Sunucu yapılandırması eksik", error: "missing_env" });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ADIM 1 — usta profili
    let usta = {
      id: null as string | null,
      name: "ToolA Asistanı",
      bolge: region,
      deneyim: "—",
      persona_md: "",
      work_md: "",
    };

    const { data: profileRow, error: profileErr } = await supabase
      .from("master_profiles")
      .select("id,name,region,experience_years,persona_md,work_md")
      .eq("region", region)
      .eq("is_active", true)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (profileErr) console.error("master_profiles query err:", profileErr);

    if (profileRow) {
      usta = {
        id: profileRow.id,
        name: profileRow.name,
        bolge: profileRow.region,
        deneyim: profileRow.experience_years ? `${profileRow.experience_years} yıl` : "—",
        persona_md: profileRow.persona_md ?? "",
        work_md: profileRow.work_md ?? "",
      };
    }

    // ADIM 2 — correction block
    const correctionBlock = buildCorrectionBlock(corrections);

    // ADIM 3 + 4 — system prompt
    const hasImage = allImages.length > 0;
    const systemPrompt = buildSystemPrompt({
      ustaName: usta.name,
      persona: usta.persona_md,
      work: usta.work_md,
      correctionBlock,
      mode,
      hasImage,
      imageCount: allImages.length,
    });

    // Mesajlar (OpenAI/Gemini uyumlu format)
    const messages: any[] = [{ role: "system", content: systemPrompt }];

    for (const h of history.slice(-10)) {
      if (h.role === "user" || h.role === "assistant") {
        messages.push({ role: h.role, content: h.content });
      }
    }

    if (hasImage) {
      const contentParts: any[] = [{ type: "text", text: question }];
      for (const img of allImages) {
        const mt = img.media_type || "image/jpeg";
        const dataUrl = img.base64.startsWith("data:")
          ? img.base64
          : `data:${mt};base64,${img.base64}`;
        contentParts.push({ type: "image_url", image_url: { url: dataUrl } });
      }
      messages.push({ role: "user", content: contentParts });
    } else {
      messages.push({ role: "user", content: question });
    }

    const tool = pickTool(mode);

    // ---- AI Gateway çağrısı ----
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        max_tokens: 4000,
        messages,
        tools: [tool],
        tool_choice: { type: "function", function: { name: tool.function.name } },
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("AI gateway err", aiResp.status, txt);
      if (aiResp.status === 429) {
        return json(200, { type: "raw", text: "Yoğunluk var, birazdan tekrar dene.", error: "rate_limited" });
      }
      if (aiResp.status === 402) {
        return json(200, { type: "raw", text: "AI kredisi tükendi. Workspace'e kredi ekleyin.", error: "no_credits" });
      }
      return json(200, { type: "raw", text: `AI gateway hatası (${aiResp.status})`, error: "ai_error" });
    }

    const data = await aiResp.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    let argsStr: string | undefined = toolCall?.function?.arguments;
    const rawText: string = data?.choices?.[0]?.message?.content ?? "";

    // Fallback: model tool_call yapmadıysa content'ten JSON çıkarmayı dene
    if (!argsStr && rawText) {
      const cleaned = rawText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      const start = cleaned.search(/[\{\[]/);
      const end = cleaned.lastIndexOf("}");
      if (start !== -1 && end > start) {
        const candidate = cleaned.substring(start, end + 1);
        try {
          JSON.parse(candidate);
          argsStr = candidate;
          console.log("tool_call yoktu, content'ten JSON çıkarıldı.");
        } catch {
          /* parse fail, fallthrough */
        }
      }
    }

    if (!argsStr) {
      console.error("Tool call yok, ham yanıt:", JSON.stringify(data).slice(0, 1000));
      return json(200, {
        type: "raw",
        text: rawText || "Cevap üretilemedi, lütfen soruyu farklı şekilde tekrar sor.",
      });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(argsStr);
    } catch (e) {
      console.error("JSON parse hata:", e, argsStr);
      return json(200, { type: "raw", text: argsStr });
    }

    const ustaPayload = { ad: usta.name, bolge: usta.bolge, deneyim: usta.deneyim };

    // ---- Mode bazlı response + side-effects ----
    if (mode === "diagnosis") {
      return json(200, {
        type: "diagnosis",
        safety: parsed.safety,
        text: parsed.text,
        steps: parsed.steps ?? [],
        top_cause: parsed.top_cause,
        alternatives: parsed.alternatives ?? [],
        recommended_parts: parsed.recommended_parts ?? [],
        usta: ustaPayload,
      });
    }

    if (mode === "info") {
      return json(200, {
        type: "info",
        text: parsed.text,
        source_ref: parsed.source_ref,
        usta: ustaPayload,
      });
    }

    // mode === "correction"
    // Otomatik kayıt
    try {
      const { error: cErr } = await supabase.from("corrections").insert({
        scene: parsed.scene,
        wrong: parsed.wrong,
        correct: parsed.correct,
        lesson: parsed.lesson,
        bolge: region,
        usta: usta.name,
        wo_id: wo_id ?? null,
      });
      if (cErr) console.error("corrections insert err:", cErr);

      const { error: rErr } = await supabase.from("correction_rules").insert({
        master_profile_id: usta.id,
        region,
        scene_pattern: parsed.scene,
        wrong: parsed.wrong,
        correct: parsed.correct,
        lesson: parsed.lesson,
        is_active: true,
        applied_count: 0,
      });
      if (rErr) console.error("correction_rules insert err:", rErr);
    } catch (e) {
      console.error("correction kayıt hata:", e);
    }

    return json(200, {
      type: "correction_learned",
      text: parsed.text,
      lesson: parsed.lesson,
      scene: parsed.scene,
      wrong: parsed.wrong,
      correct: parsed.correct,
      usta: ustaPayload,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Bilinmeyen hata";
    console.error("diagnose fatal:", e);
    return json(200, { type: "raw", text: "Bir hata oluştu: " + msg, error: "fatal" });
  }
});
