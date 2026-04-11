const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `És o assistente IA do RestoGest, uma app de gestão de restaurante buffet. Respondes sempre em português de Portugal, de forma concisa e prática.

A app tem os seguintes módulos:
- Dashboard (visão geral por perfil: Sala, Cozinha, Gerência)
- Mesas / Talão de Mesa (abertura, registo de bebidas, fecho com contagem de pax)
- Inventário (entrada via OCR de faturas, saída manual, controlo de stock)
- Tarefas (checklists diárias, ordens de serviço)
- Produção (registo de tabuleiros enviados para buffet)
- Fichas Técnicas (receitas com ingredientes e custos)
- Desperdício (registo de sobras e ações)
- Previsão (análise de vendas históricas)
- Fornecedores (perfis, encomendas automáticas)
- Preçário (preços de refeições e bebidas, unidade vs dose)
- Funcionários (gestão de staff e PINs)

Ajuda os utilizadores a navegar, explicar funcionalidades, resolver dúvidas operacionais e sugerir boas práticas de gestão de restaurante.`
          },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de pedidos excedido. Tenta novamente em breve." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-help error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
