import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Best-effort client IP for rate limiting
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const logAttempt = async (success: boolean) => {
    try {
      await supabase.from("pin_attempts").insert({ ip, success });
    } catch (_) {
      // ignore
    }
  };

  try {
    const { pin } = await req.json();

    if (!pin || typeof pin !== "string" || pin.length !== 4) {
      return new Response(
        JSON.stringify({ error: "PIN inválido" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Rate limit
    const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
    const { count: failedCount } = await supabase
      .from("pin_attempts")
      .select("*", { count: "exact", head: true })
      .eq("ip", ip)
      .eq("success", false)
      .gte("attempted_at", since);

    if ((failedCount ?? 0) >= MAX_ATTEMPTS) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Demasiadas tentativas. Tente novamente em 15 minutos.",
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify PIN via SECURITY DEFINER function against pin_hash (bcrypt)
    const { data: verified, error: verifyErr } = await supabase.rpc(
      "verify_employee_pin",
      { p_pin: pin }
    );

    if (verifyErr) {
      console.error("verify_employee_pin error:", verifyErr);
      await logAttempt(false);
      return new Response(
        JSON.stringify({ success: false }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const matches = Array.isArray(verified) ? verified : verified ? [verified] : [];
    if (matches.length > 1) {
      console.error("PIN ambíguo: múltiplos funcionários correspondem");
      await logAttempt(false);
      return new Response(
        JSON.stringify({ success: false, error: "PIN ambíguo. Contacte a gerência." }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    const employee = matches[0];
    if (!employee?.id) {
      await logAttempt(false);
      return new Response(
        JSON.stringify({ success: false }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }


    await logAttempt(true);

    const funcionarioId: string = employee.id;
    const nome: string = employee.nome;
    const { data: funcionario } = await supabase
      .from("funcionarios")
      .select("role_id, roles(chave)")
      .eq("id", funcionarioId)
      .maybeSingle();
    const papel = Array.isArray(funcionario?.roles) ? funcionario.roles[0] : funcionario?.roles;
    const role: string = (papel as { chave?: string } | null)?.chave ?? "utilizador";
    const email = `staff-${funcionarioId}@restogest.internal`;

    // Ensure synthetic auth user exists
    // @ts-ignore - admin API is available with service role client
    const admin = supabase.auth.admin;

    let userId: string | null = null;

    // IMPORTANTE: admin.listUsers() NÃO suporta filtro por email. Filtrar tem de
    // ser feito em código, percorrendo as páginas e comparando o email exacto.
    const findUserIdByEmail = async (target: string): Promise<string | null> => {
      const perPage = 200;
      for (let page = 1; page <= 25; page++) {
        // @ts-ignore
        const { data: list, error } = await admin.listUsers({ page, perPage });
        if (error) {
          console.error("listUsers error:", error);
          return null;
        }
        const match = list?.users?.find(
          (u: { id: string; email?: string }) =>
            (u.email ?? "").toLowerCase() === target.toLowerCase()
        );
        if (match) return match.id;
        if (!list?.users?.length || list.users.length < perPage) return null;
      }
      return null;
    };

    userId = await findUserIdByEmail(email);

    if (!userId) {
      const { data: created, error: createErr } = await admin.createUser({
        email,
        email_confirm: true,
        app_metadata: { funcionario_id: funcionarioId, role, nome },
        user_metadata: { nome },
      });
      if (createErr && !/already/i.test(createErr.message)) {
        console.error("createUser error:", createErr);
        return new Response(
          JSON.stringify({ success: false, error: "Falha ao criar sessão" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (created?.user) userId = created.user.id;
      if (!userId) userId = await findUserIdByEmail(email);
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: "Utilizador não encontrado" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Salvaguarda: o utilizador encontrado tem de corresponder ao email do funcionário.
    const { data: check } = await admin.getUserById(userId);
    if ((check?.user?.email ?? "").toLowerCase() !== email.toLowerCase()) {
      console.error("identity mismatch", { userId, email, found: check?.user?.email });
      return new Response(
        JSON.stringify({ success: false, error: "Falha de identidade" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Refresh app_metadata to reflect current role/nome (in case they changed)
    const roleIdAtual = (funcionario as { role_id?: string } | null)?.role_id ?? null;
    await admin.updateUserById(userId, {
      app_metadata: { funcionario_id: funcionarioId, role, role_id: roleIdAtual, nome },
      user_metadata: { nome },
    });


    // Sincroniza o papel (roles) do funcionário para user_roles, para que a RPC
    // tem_permissao funcione também nas sessões iniciadas por PIN.
    try {
      const roleId = (funcionario as { role_id?: string } | null)?.role_id ?? null;
      if (roleId) {
        const { data: papel } = await supabase
          .from("roles")
          .select("chave")
          .eq("id", roleId)
          .maybeSingle();
        await supabase.from("user_roles").delete().eq("user_id", userId);
        await supabase.from("user_roles").insert({
          user_id: userId,
          role: (papel as { chave?: string } | null)?.chave ?? role,
          role_id: roleId,
        });
      }
    } catch (syncErr) {
      console.error("sync user_roles error:", syncErr);
    }


    // Generate a magiclink and return the hashed token for verifyOtp on client
    const { data: link, error: linkErr } = await admin.generateLink({
      type: "magiclink",
      email,
    });

    if (linkErr || !link?.properties?.hashed_token) {
      console.error("generateLink error:", linkErr);
      return new Response(
        JSON.stringify({ success: false, error: "Falha ao gerar sessão" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        nome,
        role,
        funcionario_id: funcionarioId,
        email,
        token_hash: link.properties.hashed_token,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("employee-login error:", e);
    return new Response(
      JSON.stringify({ success: false, error: "Erro interno" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
