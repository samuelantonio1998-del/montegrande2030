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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Require authenticated caller; derive identity from JWT (never trust body)
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
    if (claimsErr || !claimsData?.claims || (claimsData.claims as any).role !== "authenticated") {
      return json({ error: "Unauthorized" }, 401);
    }

    const appMeta = ((claimsData.claims as any).app_metadata ?? {}) as {
      funcionario_id?: string;
      nome?: string;
      role?: string;
    };

    // Identity is derived server-side; authorization is handled by permissions elsewhere.
    const user_name = appMeta.nome || (appMeta.funcionario_id ? "Funcionário" : "Utilizador");
    const user_role = appMeta.role || "utilizador";

    const { action, module, details, metadata } = await req.json();
    if (!action || typeof action !== "string") {
      return json({ error: "action é obrigatório" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabase.from("activity_logs").insert([{
      user_name,
      user_role,
      action,
      module: module || "",
      details: details || "",
      metadata: metadata || {},
    }]);

    if (error) {
      return json({ error: "Erro ao registar log" }, 500);
    }

    return json({ success: true });
  } catch (e) {
    console.error("log-activity error:", e);
    return json({ error: "Erro interno" }, 500);
  }
});
