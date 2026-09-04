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
    // ---- AuthN/AuthZ: sessão válida + permissão via RPC tem_permissao ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "Unauthorized" }, 401);
    }
    const { data: temPerm, error: permErr } = await callerClient.rpc("tem_permissao", {
      p_permissao: "gestao.funcionarios.gerir",
    });
    if (permErr) {
      console.error("tem_permissao error:", permErr);
      return json({ error: "Erro ao verificar permissões" }, 500);
    }
    if (!temPerm) {
      return json({ error: "Sem permissão" }, 403);
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


    // ================= Gestão de utilizadores (auth) =================

    const listRoles = async () => {
      const { data } = await supabase.from("user_roles").select("user_id, role");
      const map: Record<string, string[]> = {};
      (data ?? []).forEach((r: { user_id: string; role: string }) => {
        (map[r.user_id] ??= []).push(r.role);
      });
      return map;
    };

    const countGerencia = async (): Promise<number> => {
      const { count } = await supabase
        .from("user_roles")
        .select("user_id", { count: "exact", head: true })
        .eq("role", "gerencia");
      return count ?? 0;
    };

    if (action === "users_list") {
      const { data: list, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (error) return json({ error: "Erro ao listar utilizadores" }, 500);
      const roles = await listRoles();
      const { data: unidades } = await supabase.from("unidades").select("id, nome");
      const unidadeNome = new Map((unidades ?? []).map((u: { id: string; nome: string }) => [u.id, u.nome]));
      const users = list.users.map((u) => {
        const meta = (u.app_metadata ?? {}) as Record<string, unknown>;
        const unidadeId = (meta.unidade_id as string) ?? null;
        return {
          id: u.id,
          email: u.email ?? "",
          nome: (meta.nome as string) ?? (u.user_metadata?.nome as string) ?? (u.email ?? "").split("@")[0],
          unidade_id: unidadeId,
          unidade_nome: unidadeId ? (unidadeNome.get(unidadeId) ?? null) : null,
          funcionario_id: (meta.funcionario_id as string) ?? null,
          ativo: !((u as unknown as { banned_until?: string }).banned_until),
          roles: roles[u.id] ?? [],
          created_at: u.created_at,
        };
      });
      return json({ data: users });
    }

    if (action === "user_create") {
      const { email, password, nome, unidade_id, roles } = body;
      if (!email || !password || String(password).length < 8) {
        return json({ error: "Email e password (mín. 8 caracteres) obrigatórios" }, 400);
      }
      const { data: created, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: { nome: nome ?? null, unidade_id: unidade_id ?? null },
        user_metadata: { nome: nome ?? null },
      });
      if (error || !created?.user) return json({ error: error?.message ?? "Erro ao criar utilizador" }, 400);
      if (Array.isArray(roles) && roles.length > 0) {
        await supabase.from("user_roles").insert(roles.map((r: string) => ({ user_id: created.user.id, role: r })));
      }
      return json({ success: true, id: created.user.id });
    }

    if (action === "user_update") {
      const { id, nome, unidade_id } = body;
      if (!id) return json({ error: "ID obrigatório" }, 400);
      const { data: existing } = await supabase.auth.admin.getUserById(id);
      const meta = (existing?.user?.app_metadata ?? {}) as Record<string, unknown>;
      const { error } = await supabase.auth.admin.updateUserById(id, {
        app_metadata: { ...meta, nome: nome ?? meta.nome ?? null, unidade_id: unidade_id ?? null },
        user_metadata: { nome: nome ?? null },
      });
      if (error) return json({ error: "Erro ao atualizar utilizador" }, 500);
      return json({ success: true });
    }

    if (action === "user_set_password") {
      const { id, password } = body;
      if (!id || !password || String(password).length < 8) {
        return json({ error: "Password de pelo menos 8 caracteres" }, 400);
      }
      const { error } = await supabase.auth.admin.updateUserById(id, { password });
      if (error) return json({ error: "Erro ao redefinir password" }, 500);
      return json({ success: true });
    }

    if (action === "user_set_active") {
      const { id, ativo } = body;
      if (!id || typeof ativo !== "boolean") return json({ error: "Dados incompletos" }, 400);
      if (!ativo && id === userData.user.id) return json({ error: "Não pode desativar a própria conta" }, 400);
      if (!ativo) {
        const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", id);
        const eGerencia = (r ?? []).some((x: { role: string }) => x.role === "gerencia");
        if (eGerencia && (await countGerencia()) <= 1) {
          return json({ error: "É o último utilizador com papel de gerência" }, 400);
        }
      }
      const { error } = await supabase.auth.admin.updateUserById(id, {
        ban_duration: ativo ? "none" : "876000h",
      });
      if (error) return json({ error: "Erro ao alterar estado" }, 500);
      return json({ success: true });
    }

    if (action === "role_add" || action === "role_remove") {
      const { id, role } = body;
      if (!id || !role) return json({ error: "Dados incompletos" }, 400);
      if (action === "role_add") {
        const { error } = await supabase.from("user_roles").upsert({ user_id: id, role });
        if (error) return json({ error: "Erro ao atribuir papel" }, 500);
        return json({ success: true });
      }
      if (role === "gerencia" && (await countGerencia()) <= 1) {
        return json({ error: "Não pode remover o último papel de gerência" }, 400);
      }
      const { error } = await supabase.from("user_roles").delete().eq("user_id", id).eq("role", role);
      if (error) return json({ error: "Erro ao remover papel" }, 500);
      return json({ success: true });
    }

    if (action === "user_delete") {
      const { id } = body;
      if (!id) return json({ error: "ID obrigatório" }, 400);
      if (id === userData.user.id) return json({ error: "Não pode apagar a própria conta" }, 400);
      const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", id);
      const eGerencia = (r ?? []).some((x: { role: string }) => x.role === "gerencia");
      if (eGerencia && (await countGerencia()) <= 1) {
        return json({ error: "É o último utilizador com papel de gerência" }, 400);
      }
      const { data: u } = await supabase.auth.admin.getUserById(id);
      const funcionarioId = ((u?.user?.app_metadata ?? {}) as Record<string, unknown>).funcionario_id as string | undefined;
      if (funcionarioId) {
        const { count } = await supabase
          .from("registos_producao")
          .select("id", { count: "exact", head: true })
          .eq("registado_por", ((u?.user?.app_metadata ?? {}) as Record<string, string>).nome ?? "");
        if ((count ?? 0) > 0) {
          return json({ error: "Tem registos operacionais associados. Desative em vez de apagar.", suggest_deactivate: true }, 409);
        }
      }
      await supabase.from("user_roles").delete().eq("user_id", id);
      const { error } = await supabase.auth.admin.deleteUser(id);
      if (error) return json({ error: "Erro ao apagar utilizador" }, 500);
      return json({ success: true });
    }

    return json({ error: "Ação desconhecida" }, 400);
  } catch (e) {
    console.error("manage-employees error:", e);
    return json({ error: "Erro interno" }, 500);
  }
});
