import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Close yesterday (cron runs at 00:05, so "yesterday" is the day that just ended)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().slice(0, 10);

  // Check if already closed
  const { data: existing } = await supabase
    .from("vendas_historico")
    .select("id")
    .eq("data", dateStr)
    .limit(1);

  // Get totals from fecho_mesas
  const { data: fechos } = await supabase
    .from("fecho_mesas")
    .select("total_pax, periodo")
    .eq("data", dateStr);

  if (!fechos || fechos.length === 0) {
    return new Response(JSON.stringify({ message: `No meals recorded for ${dateStr}` }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const almoco = fechos.filter((r) => r.periodo === "almoco").reduce((s, r) => s + r.total_pax, 0);
  const jantar = fechos.filter((r) => r.periodo === "jantar").reduce((s, r) => s + r.total_pax, 0);
  const total = almoco + jantar;

  if (existing && existing.length > 0) {
    await supabase
      .from("vendas_historico")
      .update({ almoco, jantar, total })
      .eq("id", existing[0].id);
  } else {
    await supabase
      .from("vendas_historico")
      .insert({ data: dateStr, almoco, jantar, total });
  }

  return new Response(
    JSON.stringify({ message: `Day closed: ${dateStr}`, almoco, jantar, total }),
    { headers: { "Content-Type": "application/json" } }
  );
});
