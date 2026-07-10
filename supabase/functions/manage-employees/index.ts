import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const validatePin = (pin: unknown): pin is string =>
  typeof pin === "string" && /^\d{4,6}$/.test(pin);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ---- AuthN/AuthZ: require an authenticated gerencia session ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const token = authHeader.slice("Bearer ".length).trim();
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return json({ error: "Unauthorized" }, 401);
    }
    const role = (claimsData.claims as any)?.app_metadata?.role;
    if (role !== "gerencia") {
      return json({ error: "Forbidden" }, 403);
    }

    const body = await req.json();
    const { action } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if PIN is already in use by an active employee (compares against pin_hash via bcrypt)
    const pinInUse = async (pin: string, excludeId?: string): Promise<boolean> => {
      const { data } = await supabase.rpc("verify_employee_pin", { p_pin: pin });
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.id) return false;
      return excludeId ? row.id !== excludeId : true;
    };

    if (action === "list") {
      const { data, error } = await supabase
        .from("funcionarios")
        .select("id, nome, role, ativo, created_at")
        .eq("ativo", true)
        .order("created_at");

      if (error) return json({ error: "Erro ao listar funcionários" }, 500);
      return json({ data });
    }

    if (action === "add") {
      const { nome, pin, role } = body;
      if (!nome || !pin || !role) return json({ error: "Dados incompletos" }, 400);
      if (!validatePin(pin)) return json({ error: "PIN deve ter 4-6 dígitos" }, 400);

      if (await pinInUse(pin)) {
        return json({ error: "Já existe um funcionário com este PIN" }, 409);
      }

      // Insert without PIN, then hash via set_employee_pin (SECURITY DEFINER)
      const { data: inserted, error: insErr } = await supabase
        .from("funcionarios")
        .insert({ nome, role, ativo: true })
        .select("id")
        .single();

      if (insErr || !inserted) {
        console.error("insert funcionario error:", insErr);
        return json({ error: "Erro ao adicionar" }, 500);
      }

      const { error: pinErr } = await supabase.rpc("set_employee_pin", {
        p_id: inserted.id,
        p_pin: pin,
      });

      if (pinErr) {
        console.error("set_employee_pin error:", pinErr);
        await supabase.from("funcionarios").delete().eq("id", inserted.id);
        return json({ error: "Erro ao definir PIN" }, 500);
      }

      return json({ success: true, id: inserted.id });
    }

    if (action === "update_pin") {
      const { id, pin } = body;
      if (!id || !pin) return json({ error: "Dados incompletos" }, 400);
      if (!validatePin(pin)) return json({ error: "PIN deve ter 4-6 dígitos" }, 400);

      if (await pinInUse(pin, id)) {
        return json({ error: "Já existe um funcionário com este PIN" }, 409);
      }

      const { error } = await supabase.rpc("set_employee_pin", { p_id: id, p_pin: pin });
      if (error) {
        console.error("set_employee_pin error:", error);
        return json({ error: "Erro ao atualizar PIN" }, 500);
      }
      return json({ success: true });
    }

    if (action === "remove") {
      const { id } = body;
      if (!id) return json({ error: "ID obrigatório" }, 400);
      await supabase.from("funcionarios").delete().eq("id", id);
      return json({ success: true });
    }

    if (action === "update_role") {
      const { id, role } = body;
      if (!id || !role) return json({ error: "Dados incompletos" }, 400);
      await supabase.from("funcionarios").update({ role }).eq("id", id);
      return json({ success: true });
    }

    if (action === "update_name") {
      const { id, nome } = body;
      if (!id || !nome) return json({ error: "Dados incompletos" }, 400);
      await supabase.from("funcionarios").update({ nome }).eq("id", id);
      return json({ success: true });
    }

    return json({ error: "Ação desconhecida" }, 400);
  } catch (e) {
    console.error("manage-employees error:", e);
    return json({ error: "Erro interno" }, 500);
  }
});
