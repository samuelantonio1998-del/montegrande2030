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

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const redirectTo: string | undefined = body?.redirectTo;
    const admin = supabase.auth.admin;

    // Try to find existing user
    let userId: string | null = null;
    try {
      // @ts-ignore
      const { data: list } = await admin.listUsers({
        page: 1,
        perPage: 1,
        // @ts-ignore
        email: ADMIN_EMAIL,
      });
      if (list?.users?.length) userId = list.users[0].id;
    } catch (_) {}

    if (!userId) {
      const { data: created, error } = await admin.createUser({
        email: ADMIN_EMAIL,
        email_confirm: true,
        app_metadata: { role: "gerencia", nome: "Administrador" },
        user_metadata: { nome: "Administrador" },
      });
      if (error && !/already/i.test(error.message)) {
        return new Response(
          JSON.stringify({ error: error.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (created?.user) userId = created.user.id;
    } else {
      await admin.updateUserById(userId, {
        app_metadata: { role: "gerencia", nome: "Administrador" },
      });
    }

    // Send recovery link so admin can set/reset password
    const { data: link, error: linkErr } = await admin.generateLink({
      type: "recovery",
      email: ADMIN_EMAIL,
      options: redirectTo ? { redirectTo } : undefined,
    });

    if (linkErr) {
      return new Response(
        JSON.stringify({ error: linkErr.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        action_link: link?.properties?.action_link ?? null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
