import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { targetDate } = await req.json();
    if (!targetDate) {
      return new Response(JSON.stringify({ error: "targetDate is required (YYYY-MM-DD)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Fetch ementa for target date + permanent items
    const PERMANENT_DATE = "9999-12-31";
    const { data: ementaItems, error: ementaErr } = await supabase
      .from("ementa_diaria")
      .select("*, buffet_item:buffet_items(id, nome, zona, ficha_tecnica_id)")
      .in("data", [targetDate, PERMANENT_DATE]);

    if (ementaErr) throw ementaErr;
    if (!ementaItems || ementaItems.length === 0) {
      return new Response(JSON.stringify({ tasks: [], message: "Sem ementa definida para este dia." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduplicate: prefer today's over permanent
    const seen = new Set<string>();
    const uniqueItems: typeof ementaItems = [];
    for (const item of ementaItems) {
      if (item.data !== PERMANENT_DATE) { seen.add(item.buffet_item_id); uniqueItems.push(item); }
    }
    for (const item of ementaItems) {
      if (item.data === PERMANENT_DATE && !seen.has(item.buffet_item_id)) {
        seen.add(item.buffet_item_id); uniqueItems.push(item);
      }
    }

    // 2. Get fichas técnicas IDs
    const fichaIds = uniqueItems
      .map(i => i.buffet_item?.ficha_tecnica_id)
      .filter(Boolean) as string[];

    let fichasData: any[] = [];
    let ingredientesData: any[] = [];

    if (fichaIds.length > 0) {
      const { data: fichas } = await supabase
        .from("fichas_tecnicas")
        .select("id, nome, categoria, porcoes, tempo_preparacao, notas_preparacao")
        .in("id", fichaIds);
      fichasData = fichas || [];

      const { data: ingredientes } = await supabase
        .from("ficha_ingredientes")
        .select("ficha_id, quantidade, unidade, produto:produtos(id, nome, stock_atual, unidade, stock_minimo)")
        .in("ficha_id", fichaIds);
      ingredientesData = ingredientes || [];
    }

    // 3. Build context for AI
    const menuContext = uniqueItems.map(item => {
      const ficha = fichasData.find(f => f.id === item.buffet_item?.ficha_tecnica_id);
      const ingredients = ingredientesData
        .filter(i => i.ficha_id === item.buffet_item?.ficha_tecnica_id)
        .map(i => ({
          nome: i.produto?.nome,
          quantidade_necessaria: i.quantidade,
          unidade: i.unidade,
          stock_atual: i.produto?.stock_atual,
          stock_minimo: i.produto?.stock_minimo,
        }));

      return {
        prato: item.buffet_item?.nome || "Desconhecido",
        zona: item.buffet_item?.zona,
        quantidade_prevista: item.quantidade_prevista,
        recipiente: item.recipiente_sugerido,
        tempo_preparacao: ficha?.tempo_preparacao,
        notas_preparacao: ficha?.notas_preparacao,
        ingredientes: ingredients,
      };
    });

    // 4. Call AI
    const systemPrompt = `És um assistente de cozinha profissional para um restaurante buffet em Portugal.
Com base na ementa do dia seguinte, gera uma lista de tarefas de preparação que a equipa precisa de executar.

Regras:
- Cada tarefa deve ser clara, concreta e acionável
- Inclui tarefas como: descongelar ingredientes, preparar marinadas, pré-cortar vegetais, verificar stocks em falta, preparar bases de molhos
- Se o stock de um ingrediente está abaixo do mínimo ou é insuficiente para a receita, alerta para isso
- Agrupa logicamente: primeiro verificações de stock, depois preparações que levam mais tempo, depois as rápidas
- Atribui prioridade: alta (crítico, sem isto o prato não pode ser feito), media (importante mas não bloqueante), baixa (nice-to-have)
- Categoria deve ser sempre "abertura" pois são preparações para o dia seguinte
- Máximo 15 tarefas, foca no essencial`;

    const userPrompt = `Ementa para ${targetDate}:\n${JSON.stringify(menuContext, null, 2)}\n\nGera as tarefas de preparação.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "create_prep_tasks",
            description: "Create preparation tasks for the kitchen team",
            parameters: {
              type: "object",
              properties: {
                tasks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      titulo: { type: "string", description: "Task title, clear and concise" },
                      descricao: { type: "string", description: "Detailed description with quantities if applicable" },
                      prioridade: { type: "string", enum: ["alta", "media", "baixa"] },
                    },
                    required: ["titulo", "descricao", "prioridade"],
                  },
                },
                stock_alerts: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      produto: { type: "string" },
                      motivo: { type: "string" },
                    },
                    required: ["produto", "motivo"],
                  },
                },
              },
              required: ["tasks"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "create_prep_tasks" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de pedidos excedido, tente novamente em breve." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-prep-tasks error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
