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

    if (!pin || typeof pin !== "string" || pin.length < 4 || pin.length > 6) {
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

    const employee = Array.isArray(verified) ? verified[0] : verified;
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
    const role: string = employee.role;
    const email = `staff-${funcionarioId}@restogest.internal`;

    // Ensure synthetic auth user exists
    // @ts-ignore - admin API is available with service role client
    const admin = supabase.auth.admin;

    let userId: string | null = null;

    // Try to find existing user via listUsers (paged); fallback to createUser
    // and treat "already registered" as success by re-fetching.
    const { data: existing, error: getErr } = await admin.getUserById(
      // Not applicable here; instead we use listUsers by email via filter
      "" as unknown as string
    ).catch(() => ({ data: null, error: null as any }));

    // Prefer listUsers with email filter (supported in supabase-js v2)
    try {
      // @ts-ignore
      const { data: list } = await admin.listUsers({
        page: 1,
        perPage: 1,
        // @ts-ignore
        email,
      });
      if (list?.users?.length) userId = list.users[0].id;
    } catch (_) {
      // ignore, will try create
    }

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
      // If already existed (race), re-list
      if (!userId) {
        // @ts-ignore
        const { data: list2 } = await admin.listUsers({
          page: 1,
          perPage: 1,
          // @ts-ignore
          email,
        });
        if (list2?.users?.length) userId = list2.users[0].id;
      }
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

    // Refresh app_metadata to reflect current role/nome (in case they changed)
    await admin.updateUserById(userId, {
      app_metadata: { funcionario_id: funcionarioId, role, nome },
      user_metadata: { nome },
    });

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
