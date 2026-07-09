import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "samuelantonio1998@hotmail.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const debug: Record<string, unknown> = {};

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const srv = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const initialPassword = Deno.env.get("ADMIN_INITIAL_PASSWORD");

    debug.has_url = !!url;
    debug.has_service_role = !!srv;
    debug.has_admin_password = !!initialPassword;
    debug.admin_password_length = initialPassword?.length ?? 0;

    if (!url || !srv) {
      return new Response(JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY", debug }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!initialPassword) {
      return new Response(JSON.stringify({ error: "ADMIN_INITIAL_PASSWORD not set", debug }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(url, srv);
    const admin = supabase.auth.admin;

    // Find existing user by paging (listUsers email filter is unreliable)
    let userId: string | null = null;
    let page = 1;
    while (page <= 20) {
      const { data: list, error: listErr } = await admin.listUsers({ page, perPage: 200 });
      if (listErr) {
        debug.list_error = listErr.message;
        break;
      }
      const found = list?.users?.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());
      if (found) { userId = found.id; break; }
      if (!list?.users?.length || list.users.length < 200) break;
      page++;
    }

    debug.existing_user_id = userId;

    let action: string;
    if (!userId) {
      const { data: created, error } = await admin.createUser({
        email: ADMIN_EMAIL,
        password: initialPassword,
        email_confirm: true,
        app_metadata: { role: "gerencia", nome: "Administrador" },
        user_metadata: { nome: "Administrador" },
      });
      if (error) {
        debug.create_error = error.message;
        return new Response(JSON.stringify({ error: `createUser failed: ${error.message}`, debug }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = created?.user?.id ?? null;
      action = "created";
    } else {
      const { error: updErr } = await admin.updateUserById(userId, {
        password: initialPassword,
        email_confirm: true,
        app_metadata: { role: "gerencia", nome: "Administrador" },
      });
      if (updErr) {
        debug.update_error = updErr.message;
        return new Response(JSON.stringify({ error: `updateUser failed: ${updErr.message}`, debug }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      action = "updated";
    }

    return new Response(JSON.stringify({ success: true, user_id: userId, action, debug }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown", debug }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
