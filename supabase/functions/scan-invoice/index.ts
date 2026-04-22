import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "imageBase64 is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an invoice/receipt OCR assistant for a restaurant. Extract product items AND invoice metadata from the invoice image.

INVOICE METADATA - CRITICAL: Always extract these from the invoice header/footer:
- numero_fatura: The invoice number, document number, receipt number, or any unique identifier (e.g., "FT 2024/1234", "Fatura nº 567", "Doc. 890", "Recibo 123"). Look for labels like "Fatura", "FT", "Doc.", "Nº", "Invoice", "Receipt", etc.
- data_fatura: The invoice date AND time if available, in the format shown on the document (e.g., "03/04/2026 14:30", "2026-04-03"). Look for "Data:", "Date:", or date patterns near the top of the document.
- fornecedor_nome: The supplier/company name from the invoice header or logo.

PRODUCT ITEMS - Extract with these fields:
- nome: product name (string)
- quantidade: TOTAL quantity of INDIVIDUAL UNITS (number).
- unidade: the INDIVIDUAL unit of measure inside the pack (e.g., "lata", "garrafa", "un", "kg", "L"). NEVER return "caixa" or "pack" — always the smallest sellable unit.
- custo_unitario: net price PER INDIVIDUAL UNIT (excluding VAT, before line discounts).

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
WORKED EXAMPLE (this exact mistake just happened in production):
============================================================
Invoice line: "COCA COLA REGULAR LATA 28X33CL"  Qtd: 2  Preço: 19.39  Total: 38.78
  - units_per_pack = 28 (from "28X33CL" → 28 cans of 33cl)
  - packs_ordered  = 2
  - price_per_pack = 19.39

  CORRECT output:
    nome           = "Coca Cola Regular Lata 33cl"
    quantidade     = 2 × 28 = 56
    unidade        = "lata"          ← NOT "garrafa", NOT "caixa"
    custo_unitario = 19.39 ÷ 28 ≈ 0.6925
    Sanity check: 56 × 0.6925 = 38.78  ✓ matches line total

  WRONG output (DO NOT DO THIS):
    quantidade=56, custo_unitario=19.39  → implies 56 × 19.39 = €1085.84 (absurd)
    quantidade=2,  custo_unitario=19.39  → forgot to expand pack

============================================================
SANITY CHECK (mandatory before returning each item):
============================================================
For every item, verify:  quantidade × custo_unitario ≈ line_total_on_invoice (within ±5%, ignoring discount).
If your numbers produce a total that differs wildly from the printed line total, YOU GOT IT WRONG —
recompute by re-reading the pack size and the price column.

============================================================
OTHER QUANTITY RULES:
============================================================
1. Decimal quantities (weight): "2.500" with unit KG means 2.5 kg, not 2500.
2. SKUs / article codes are NOT quantities. Ignore them when reading the qty column.
3. If no pack indicator is in the name, quantidade = the number in the qty column as-is.
4. Quantities must be realistic for a restaurant (no 44038-unit orders).
- desconto: TOTAL discount amount in euros for the ENTIRE line (number, default 0). This is the total discount for all units on this line, NOT per unit. If a percentage discount is shown (e.g., 3% on a line totaling €127.10), calculate: line_total × percentage / 100 = €3.81. If no discount, return 0. Look for columns labeled "Desconto", "Desc.", "Discount", "%Desc", or negative values.
- fornecedor: supplier name if visible on the invoice header/footer (string or null).
- sku: product code, reference number, or article code if visible next to the product line (string or null). IMPORTANT: Always extract the product reference/code/SKU when available.

Only return the JSON via the tool call, no other text. If you cannot read the invoice, return empty items array.
Always use Portuguese product names when possible.
REMEMBER: For bundled/pack items, ALWAYS multiply to get total individual units and divide cost to get per-unit cost.
REMEMBER: Always check for discount columns/values on each line item.
DOUBLE-CHECK all quantities before returning - they should be realistic for a restaurant order.`,
          },
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
                  numero_fatura: { type: "string", description: "Invoice/document number or unique identifier" },
                  data_fatura: { type: "string", description: "Invoice date and time as shown on document" },
                  fornecedor_nome: { type: "string", description: "Supplier/company name" },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        nome: { type: "string", description: "Product name" },
                        quantidade: { type: "number", description: "Quantity" },
                        unidade: { type: "string", description: "Unit (kg, L, un, garrafa, caixa)" },
                        custo_unitario: { type: "number", description: "GROSS unit price in euros WITHOUT VAT, BEFORE discounts. E.g. if price is 12.71 with 3% discount, return 12.71 NOT 12.33" },
                        desconto: { type: "number", description: "TOTAL discount in euros for the entire line (0 if none). E.g. 10kg at 12.71 with 3% = 127.1 * 0.03 = 3.81" },
                        fornecedor: { type: "string", description: "Supplier name if visible" },
                        sku: { type: "string", description: "Product code if visible" },
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
    
    let items = [];
    let numero_fatura = null;
    let data_fatura = null;
    let fornecedor_nome = null;

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      items = parsed.items || [];
      numero_fatura = parsed.numero_fatura || null;
      data_fatura = parsed.data_fatura || null;
      fornecedor_nome = parsed.fornecedor_nome || null;
    }

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
