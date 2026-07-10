import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CatalogoItem {
  id: string;
  nome: string;
  sku?: string | null;
  unidade?: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Require authenticated caller
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const token = authHeader.slice("Bearer ".length).trim();
  const authClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims || (claimsData.claims as any).role !== "authenticated") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { imageBase64, catalogo } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "imageBase64 is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const catalogoArr: CatalogoItem[] = Array.isArray(catalogo)
      ? catalogo.slice(0, 400)
      : [];
    const catalogoIds = new Set(catalogoArr.map((c) => c.id));

    const catalogoSection = catalogoArr.length > 0
      ? `\n\n============================================================
CATÁLOGO DE PRODUTOS DO RESTAURANTE (fazer matching contra esta lista)
============================================================
Formato: id | nome | SKU:xxx | unidade
${catalogoArr.map((c) => `${c.id} | ${c.nome} | SKU:${c.sku ?? "-"} | ${c.unidade ?? "-"}`).join("\n")}

MATCHING RULES — para CADA item extraído da fatura:
1. Se a fatura mostrar um código de artigo igual a um SKU do catálogo → match por SKU (confianca="alta").
2. Senão faz match semântico pelo nome. Considera abreviaturas comuns em português:
   QJ = queijo, MANT = manteiga, BR = branco, TN = tinto, AZ = azeite, AZT = azeite,
   INT = integral, ½ = meio, S/ = sem, C/ = com, EMB = embalagem, GRF = garrafa,
   LT = litro, GR/G = grama, KG = quilo, UN = unidade.
   Exemplo: "AZEITE VIRGEM EXTRA 5L SOVENA" na fatura ≈ "AZEITE 5LT" no catálogo.
3. Devolve produto_id_sugerido = id EXATO do catálogo (copiar da lista acima).
   NUNCA inventes um id. Se não tiveres a certeza, devolve produto_id_sugerido=null e confianca="nenhuma".
4. confianca:
   - "alta" = match por SKU ou nome praticamente idêntico
   - "media" = match semântico razoável (nome parecido, mesma unidade base)
   - "baixa" = candidato possível mas com dúvida
   - "nenhuma" = sem correspondência no catálogo`
      : "";

    const systemPrompt = `You are an invoice/receipt OCR assistant for a restaurant. Extract product items AND invoice metadata from the invoice image.

INVOICE METADATA - CRITICAL: Always extract these from the invoice header/footer:
- numero_fatura: The invoice number, document number, receipt number, or any unique identifier (e.g., "FT 2024/1234", "Fatura nº 567", "Doc. 890", "Recibo 123"). Look for labels like "Fatura", "FT", "Doc.", "Nº", "Invoice", "Receipt", etc.
- data_fatura: The invoice date AND time if available, in the format shown on the document (e.g., "03/04/2026 14:30", "2026-04-03"). Look for "Data:", "Date:", or date patterns near the top of the document.
- fornecedor_nome: The supplier/company name from the invoice header or logo.

PRODUCT ITEMS - Extract with these fields:
- nome: product name (string)
- quantidade: TOTAL quantity of INDIVIDUAL UNITS (number).
- unidade: the INDIVIDUAL unit of measure inside the pack (e.g., "lata", "garrafa", "un", "kg", "L"). NEVER return "caixa" or "pack" — always the smallest sellable unit.
- custo_unitario: net price PER INDIVIDUAL UNIT (excluding VAT, before line discounts).
- total_linha: the line total EXACTLY as printed on the invoice (number). Always extract this value.

============================================================
PACK / BUNDLE HANDLING — THIS IS THE #1 SOURCE OF ERRORS. READ CAREFULLY.
============================================================

Look in the product NAME for pack indicators like:
  "28X33CL", "24X33CL", "6X1,5L", "X12", "X6", "Pack 6", "Cx 24", "1,5LTX6"
The number BEFORE the "X" (or after "Pack/Cx") is units_per_pack.

The QUANTITY COLUMN on the invoice shows the number of PACKS ordered, NOT individual units.
The PRICE COLUMN on the invoice shows the price PER PACK, NOT per individual unit.

YOU MUST CONVERT BOTH:
  quantidade        = packs_ordered  × units_per_pack
  custo_unitario    = price_per_pack ÷ units_per_pack

============================================================
WORKED EXAMPLE:
============================================================
Invoice line: "COCA COLA REGULAR LATA 28X33CL"  Qtd: 2  Preço: 19.39  Total: 38.78
  - units_per_pack = 28
  - packs_ordered  = 2
  - price_per_pack = 19.39

  CORRECT: quantidade=56, unidade="lata", custo_unitario≈0.6925, total_linha=38.78
  Sanity: 56 × 0.6925 = 38.78 ✓

============================================================
MANDATORY SANITY CHECK before returning EACH item:
============================================================
Verify:  quantidade × custo_unitario − desconto ≈ total_linha  (±5%)
If it doesn't match, RE-READ the pack size and the price column and recompute.

OTHER RULES:
1. Decimal quantities (weight): "2.500" with unit KG means 2.5 kg, not 2500.
2. SKUs / article codes are NOT quantities.
3. If no pack indicator is in the name, quantidade = number in qty column as-is.
4. Quantities must be realistic for a restaurant.
5. desconto: TOTAL discount in euros for the ENTIRE line (0 if none). If a percentage (e.g., 3%) is shown, compute line_total × pct / 100. Look for "Desconto", "Desc.", "%Desc".
6. fornecedor: supplier name if visible.
7. sku: product code / article reference next to the product line.

Only return the JSON via the tool call, no other text. Use Portuguese product names when possible.${catalogoSection}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract all product items AND invoice metadata (number, date, supplier) from this invoice/receipt image:",
              },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_invoice_data",
              description: "Extract invoice metadata and product items from an invoice image",
              parameters: {
                type: "object",
                properties: {
                  numero_fatura: { type: "string", description: "Invoice/document number" },
                  data_fatura: { type: "string", description: "Invoice date and time" },
                  fornecedor_nome: { type: "string", description: "Supplier/company name" },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        nome: { type: "string" },
                        quantidade: { type: "number" },
                        unidade: { type: "string" },
                        custo_unitario: { type: "number", description: "Net unit price, before line discount" },
                        desconto: { type: "number", description: "TOTAL discount in euros for the entire line (0 if none)" },
                        total_linha: { type: "number", description: "Line total EXACTLY as printed on the invoice" },
                        fornecedor: { type: "string" },
                        sku: { type: "string" },
                        produto_id_sugerido: { type: "string", description: "Exact id from provided catálogo, or null if no match" },
                        confianca: { type: "string", enum: ["alta", "media", "baixa", "nenhuma"] },
                      },
                      required: ["nome", "quantidade", "unidade", "custo_unitario", "desconto"],
                    },
                  },
                },
                required: ["items"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_invoice_data" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de pedidos excedido. Tente novamente em breve." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erro ao processar a imagem" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();

    let items: any[] = [];
    let numero_fatura = null;
    let data_fatura = null;
    let fornecedor_nome = null;

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      items = Array.isArray(parsed.items) ? parsed.items : [];
      numero_fatura = parsed.numero_fatura || null;
      data_fatura = parsed.data_fatura || null;
      fornecedor_nome = parsed.fornecedor_nome || null;
    }

    // Server-side validation
    items = items.map((it: any) => {
      let produto_id_sugerido: string | null = it.produto_id_sugerido ?? null;
      let confianca: string = it.confianca ?? "nenhuma";

      // Anti-hallucination: discard ids not in catálogo
      if (produto_id_sugerido && !catalogoIds.has(produto_id_sugerido)) {
        produto_id_sugerido = null;
        confianca = "nenhuma";
      }
      if (catalogoArr.length === 0) {
        produto_id_sugerido = null;
        confianca = "nenhuma";
      }

      const qtd = Number(it.quantidade) || 0;
      const preco = Number(it.custo_unitario) || 0;
      const desc = Number(it.desconto) || 0;
      const totalLinha = it.total_linha != null ? Number(it.total_linha) : null;

      let warning = false;
      let warning_msg: string | null = null;

      if (qtd > 10000 || preco > 10000) {
        warning = true;
        warning_msg = "Valores irrealistas — verificar manualmente";
      } else if (totalLinha == null || totalLinha === 0) {
        warning_msg = "Sem total de linha para validar";
      } else {
        const computed = qtd * preco - desc;
        const diff = Math.abs(computed - totalLinha) / Math.abs(totalLinha);
        if (diff > 0.05) {
          warning = true;
          warning_msg = `Qtd×preço−desc = €${computed.toFixed(2)} ≠ total impresso €${totalLinha.toFixed(2)}`;
        }
      }

      return {
        ...it,
        total_linha: totalLinha,
        produto_id_sugerido,
        confianca,
        warning,
        warning_msg,
      };
    });

    return new Response(JSON.stringify({ items, numero_fatura, data_fatura, fornecedor_nome }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scan-invoice error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
