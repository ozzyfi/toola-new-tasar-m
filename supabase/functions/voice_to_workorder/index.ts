const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Category = "ariza" | "bakim" | "parca" | "diger";

const CATEGORY_TOOLS: Record<Category, { description: string; parameters: any }> = {
  ariza: {
    description: "Arıza raporunu yapılandır",
    parameters: {
      type: "object",
      properties: {
        ariza: { type: "string", description: "Arızanın kısa tanımı (ör. 'Hidrolik basınç düşüklüğü')" },
        neden: { type: "string", description: "Arızanın nedeni (ör. 'Yağ filtresi tıkanıklığı')" },
        yapilan: { type: "string", description: "Yapılan işlem (ör. 'HF-0330 filtre değiştirildi, sistem temizlendi')" },
        sure: { type: "integer", description: "İşlem süresi DAKİKA cinsinden integer (ör. 45)" },
      },
      required: ["ariza", "neden", "yapilan", "sure"],
      additionalProperties: false,
    },
  },
  bakim: {
    description: "Bakım raporunu yapılandır",
    parameters: {
      type: "object",
      properties: {
        yapilanBakim: { type: "string", description: "Yapılan bakım işlemleri" },
        periyod: { type: "string", description: "Bakım periyodu (ör. '2000 saat / 3 ay')" },
        notlar: { type: "string", description: "Ek notlar / takip önerileri" },
      },
      required: ["yapilanBakim", "periyod", "notlar"],
      additionalProperties: false,
    },
  },
  parca: {
    description: "Parça değişim raporunu yapılandır",
    parameters: {
      type: "object",
      properties: {
        parca: { type: "string", description: "Değiştirilen parçanın adı" },
        nedenDeg: { type: "string", description: "Değişim nedeni" },
        parcaNo: { type: "string", description: "Parça numarası (olduğu gibi aktar, değiştirme)" },
      },
      required: ["parca", "nedenDeg", "parcaNo"],
      additionalProperties: false,
    },
  },
  diger: {
    description: "Diğer işlem raporunu yapılandır",
    parameters: {
      type: "object",
      properties: {
        islem: { type: "string", description: "Yapılan işlem türü" },
        aciklama: { type: "string", description: "İşlem açıklaması" },
        notlar2: { type: "string", description: "Ek notlar" },
      },
      required: ["islem", "aciklama", "notlar2"],
      additionalProperties: false,
    },
  },
};

const SYSTEM_PROMPT = (category: Category) => `Sen endüstriyel bir saha sekreterisin. Teknisyenin sözlü raporunu analiz et ve kategoriye uygun form alanlarına yerleştir.

Kategori: ${category}

KURALLAR:
1. Sadece tool çağrısı ile yapılandırılmış veri dön.
2. Eksik bilgi varsa o alanı boş string ("") bırak. Asla uydurma.
3. 'sure' alanı integer (dakika). '45 dakika' → 45. Belirtilmemişse 0.
4. Parça numaralarını olduğu gibi aktar, değiştirme.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, category } = await req.json();

    if (!transcript || typeof transcript !== "string") {
      return new Response(
        JSON.stringify({ error: "transcript (string) zorunlu", values: {} }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const cat = category as Category;
    if (!CATEGORY_TOOLS[cat]) {
      return new Response(
        JSON.stringify({ error: "category geçersiz. ariza|bakim|parca|diger olmalı", values: {} }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY tanımlı değil", values: {} }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const toolName = `fill_${cat}`;
    const tool = CATEGORY_TOOLS[cat];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    let aiResp: Response;
    try {
      aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          max_tokens: 500,
          messages: [
            { role: "system", content: SYSTEM_PROMPT(cat) },
            { role: "user", content: transcript },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: toolName,
                description: tool.description,
                parameters: tool.parameters,
              },
            },
          ],
          tool_choice: { type: "function", function: { name: toolName } },
        }),
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("AI gateway error", aiResp.status, txt);
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit aşıldı, lütfen biraz sonra deneyin.", values: {} }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI kredisi tükendi. Lovable AI workspace'e kredi ekleyin.", values: {} }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ error: `AI gateway hatası: ${aiResp.status}`, values: {} }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await aiResp.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    const argsStr = toolCall?.function?.arguments;

    if (!argsStr) {
      console.error("Tool call eksik", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "Model yapılandırılmış çıktı dönmedi", values: {} }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let values: Record<string, unknown>;
    try {
      values = JSON.parse(argsStr);
    } catch (e) {
      console.error("JSON parse hata", e, argsStr);
      return new Response(
        JSON.stringify({ error: "Çıktı parse edilemedi", values: {} }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // sure alanını integer'a zorla
    if (cat === "ariza" && values.sure != null) {
      const n = parseInt(String(values.sure), 10);
      values.sure = Number.isFinite(n) ? n : 0;
    }

    return new Response(JSON.stringify({ values }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? (e.name === "AbortError" ? "Zaman aşımı (10s)" : e.message) : "Bilinmeyen hata";
    console.error("voice_to_workorder hata", e);
    return new Response(JSON.stringify({ error: msg, values: {} }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
