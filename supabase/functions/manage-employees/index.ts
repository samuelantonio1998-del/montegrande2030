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
    const body = await req.json();
    const { action } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "list") {
      const { data, error } = await supabase
        .from("funcionarios")
        .select("id, nome, role, ativo, created_at")
        .eq("ativo", true)
        .order("created_at");

      if (error) {
        return new Response(
          JSON.stringify({ error: "Erro ao listar funcionários" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Never return PINs to client
      return new Response(
        JSON.stringify({ data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "add") {
      const { nome, pin, role } = body;
      if (!nome || !pin || !role) {
        return new Response(
          JSON.stringify({ error: "Dados incompletos" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (typeof pin !== "string" || pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
        return new Response(
          JSON.stringify({ error: "PIN deve ter 4-6 dígitos" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check duplicate PIN
      const { data: existing } = await supabase
        .from("funcionarios")
        .select("id")
        .eq("pin", pin)
        .eq("ativo", true)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({ error: "Já existe um funcionário com este PIN" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabase
        .from("funcionarios")
        .insert({ nome, pin, role });

      if (error) {
        return new Response(
          JSON.stringify({ error: "Erro ao adicionar" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "remove") {
      const { id } = body;
      if (!id) {
        return new Response(
          JSON.stringify({ error: "ID obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase.from("funcionarios").delete().eq("id", id);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "update_role") {
      const { id, role } = body;
      if (!id || !role) {
        return new Response(
          JSON.stringify({ error: "Dados incompletos" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase.from("funcionarios").update({ role }).eq("id", id);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "update_name") {
      const { id, nome } = body;
      if (!id || !nome) {
        return new Response(
          JSON.stringify({ error: "Dados incompletos" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase.from("funcionarios").update({ nome }).eq("id", id);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Ação desconhecida" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
