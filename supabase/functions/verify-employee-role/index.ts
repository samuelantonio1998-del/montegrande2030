import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { pin, requiredPermission } = await req.json();

    if (typeof pin !== "string" || !/^\d{4,6}$/.test(pin)) {
      return new Response(
        JSON.stringify({ error: "PIN inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Compare against bcrypt hash (pin_hash) via SECURITY DEFINER function
    const { data, error } = await supabase.rpc("verify_employee_pin", { p_pin: pin });
    const row = Array.isArray(data) ? data[0] : data;

    if (error || !row?.id) {
      return new Response(
        JSON.stringify({ success: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (requiredPermission) {
      const { data: funcionario } = await supabase
        .from("funcionarios")
        .select("role_id")
        .eq("id", row.id)
        .eq("ativo", true)
        .maybeSingle();
      const { data: permissao } = await supabase
        .from("permissoes")
        .select("id")
        .eq("chave", requiredPermission)
        .maybeSingle();
      const { count } = funcionario?.role_id && permissao?.id
        ? await supabase
          .from("role_permissoes_v2")
          .select("role_id", { count: "exact", head: true })
          .eq("role_id", funcionario.role_id)
          .eq("permissao_id", permissao.id)
        : { count: 0 };
      if (!count) {
        return new Response(
          JSON.stringify({ success: false }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, nome: row.nome, role: row.role }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
