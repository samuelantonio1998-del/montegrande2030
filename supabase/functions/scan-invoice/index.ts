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
- quantidade: TOTAL quantity of individual units (number). CRITICAL RULE FOR PACKS/BUNDLES: If the product is sold in packs or bundles, you MUST multiply the number of packs by the units per pack to get the total individual units. Look for patterns like:
  * "X6", "x6", "X12", "x24" in the product name → multiply ordered quantity by that number
  * "1,5LTX6" means pack of 6 bottles of 1.5L → if 4 ordered, quantidade = 4 * 6 = 24
  * "24X33C" or "24x33cl" means pack of 24 units of 33cl → if 2 ordered, quantidade = 2 * 24 = 48
  * "Pack", "Pk", "Cx" followed by a number → multiply accordingly
  * "6x1L", "12x0.5L" → the first number is units per pack
  Always calculate: quantidade = packs_ordered × units_per_pack. If no pack indicator, use the quantity as-is.
- unidade: unit of measure - un, garrafa, kg, L, caixa, etc. (string). For packed items, use the individual unit (e.g., "un" for bottles, "garrafa" for wine bottles).
- custo_unitario: NET unit cost in euros WITHOUT VAT/IVA PER INDIVIDUAL UNIT (number). CRITICAL: If the invoice price is per pack, divide by the number of units in the pack to get the per-unit cost. Always use values BEFORE tax/IVA. If the invoice shows both gross and net values, use the net (sem IVA) value. If only gross values are shown, calculate the net value by removing the applicable VAT rate.
- fornecedor: supplier name if visible on the invoice header/footer (string or null). IMPORTANT: Always extract the supplier/company name from the invoice header, logo, or footer.
- sku: product code, reference number, or article code if visible next to the product line (string or null). IMPORTANT: Always extract the product reference/code/SKU when available - look for codes like "REF:", "Art.", "Cod.", numbers at the start of each line, or any alphanumeric identifier associated with each product.

Only return the JSON via the tool call, no other text. If you cannot read the invoice, return empty items array.
Always use Portuguese product names when possible. Pay special attention to product codes/references and supplier identification as they are crucial for inventory matching.
REMEMBER: For bundled/pack items, ALWAYS multiply to get total individual units and divide cost to get per-unit cost.`,
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
                        custo_unitario: { type: "number", description: "NET unit cost in euros WITHOUT VAT/IVA" },
                        fornecedor: { type: "string", description: "Supplier name if visible" },
                        sku: { type: "string", description: "Product code if visible" },
                      },
                      required: ["nome", "quantidade", "unidade", "custo_unitario"],
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
