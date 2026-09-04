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

    // ================= Pessoas (funcionário PIN + conta de gestão) =================

    const GERENCIA_CHAVE = "gerencia";

    const getRoleById = async (roleId: string) => {
      const { data } = await supabase.from("roles").select("id, nome, chave, is_base").eq("id", roleId).maybeSingle();
      return data as { id: string; nome: string; chave: string; is_base: boolean } | null;
    };

    const gerenciaRoleId = async (): Promise<string | null> => {
      const { data } = await supabase.from("roles").select("id").eq("chave", GERENCIA_CHAVE).maybeSingle();
      return (data as { id: string } | null)?.id ?? null;
    };

    // Nº de pessoas ativas com papel de gerência (contas de gestão + funcionários PIN)
    const contarGerencia = async (): Promise<number> => {
      const gId = await gerenciaRoleId();
      if (!gId) return 0;
      const { data: urs } = await supabase.from("user_roles").select("user_id").eq("role_id", gId);
      const { data: funcs } = await supabase
        .from("funcionarios")
        .select("id")
        .eq("role_id", gId)
        .eq("ativo", true);
      return (urs?.length ?? 0) + (funcs?.length ?? 0);
    };

    const temRegistosOperacionais = async (nome: string): Promise<boolean> => {
      const { count } = await supabase
        .from("registos_producao")
        .select("id", { count: "exact", head: true })
        .eq("registado_por", nome);
      return (count ?? 0) > 0;
    };

    const findAuthUserByFuncionario = async (funcionarioId: string) => {
      const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      return (
        list?.users.find(
          (u) => ((u.app_metadata ?? {}) as Record<string, unknown>).funcionario_id === funcionarioId,
        ) ?? null
      );
    };

    if (action === "pessoas_list") {
      const { data: funcs } = await supabase
        .from("funcionarios")
        .select("id, nome, role_id, unidade_id, ativo, pin_hash, created_at")
        .order("created_at");
      const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (listErr) return json({ error: "Erro ao listar pessoas" }, 500);
      const { data: rolesData } = await supabase.from("roles").select("id, nome, chave, ativo, is_base");
      const { data: urs } = await supabase.from("user_roles").select("user_id, role_id");
      const { data: unidades } = await supabase.from("unidades").select("id, nome");

      const unidadeNome = new Map((unidades ?? []).map((u: { id: string; nome: string }) => [u.id, u.nome]));
      const roleById = new Map((rolesData ?? []).map((r: { id: string }) => [r.id, r]));
      const roleDoUser = new Map<string, string>();
      (urs ?? []).forEach((r: { user_id: string; role_id: string | null }) => {
        if (r.role_id) roleDoUser.set(r.user_id, r.role_id);
      });

      const contaPorFuncionario = new Map<string, (typeof list.users)[number]>();
      const contasSoltas: typeof list.users = [];
      list.users.forEach((u) => {
        const fid = ((u.app_metadata ?? {}) as Record<string, unknown>).funcionario_id as string | undefined;
        if (fid) contaPorFuncionario.set(fid, u);
        else contasSoltas.push(u);
      });

      type Pessoa = Record<string, unknown>;
      const pessoas: Pessoa[] = [];

      (funcs ?? []).forEach((f: Record<string, unknown>) => {
        const conta = contaPorFuncionario.get(f.id as string) ?? null;
        const roleId = (f.role_id as string) ?? (conta ? roleDoUser.get(conta.id) ?? null : null);
        pessoas.push({
          key: `f:${f.id}`,
          funcionario_id: f.id,
          user_id: conta?.id ?? null,
          nome: f.nome,
          email: conta?.email ?? null,
          unidade_id: f.unidade_id ?? null,
          unidade_nome: f.unidade_id ? unidadeNome.get(f.unidade_id as string) ?? null : null,
          role_id: roleId,
          role_nome: roleId ? (roleById.get(roleId) as { nome?: string } | undefined)?.nome ?? null : null,
          tem_pin: !!f.pin_hash,
          tem_conta: !!conta,
          ativo: !!f.ativo && !(conta && (conta as unknown as { banned_until?: string }).banned_until),
          created_at: f.created_at,
        });
      });

      contasSoltas.forEach((u) => {
        const meta = (u.app_metadata ?? {}) as Record<string, unknown>;
        const unidadeId = (meta.unidade_id as string) ?? null;
        const roleId = roleDoUser.get(u.id) ?? null;
        pessoas.push({
          key: `u:${u.id}`,
          funcionario_id: null,
          user_id: u.id,
          nome: (meta.nome as string) ?? (u.user_metadata?.nome as string) ?? (u.email ?? "").split("@")[0],
          email: u.email ?? null,
          unidade_id: unidadeId,
          unidade_nome: unidadeId ? unidadeNome.get(unidadeId) ?? null : null,
          role_id: roleId,
          role_nome: roleId ? (roleById.get(roleId) as { nome?: string } | undefined)?.nome ?? null : null,
          tem_pin: false,
          tem_conta: true,
          ativo: !(u as unknown as { banned_until?: string }).banned_until,
          created_at: u.created_at,
        });
      });

      return json({ data: pessoas, roles: rolesData ?? [] });
    }

    if (action === "pessoa_create") {
      const { nome, role_id, unidade_id, pin, email, password } = body;
      if (!nome) return json({ error: "Nome obrigatório" }, 400);
      if (!pin && !email) return json({ error: "Indique um PIN de cozinha ou um email de conta" }, 400);
      if (pin && !validatePin(pin)) return json({ error: "PIN deve ter 4-6 dígitos" }, 400);
      if (pin && (await pinInUse(pin))) return json({ error: "Já existe alguém com este PIN" }, 409);
      if (email && (!password || String(password).length < 8)) {
        return json({ error: "Password de pelo menos 8 caracteres" }, 400);
      }

      const papel = role_id ? await getRoleById(role_id) : null;

      let funcionarioId: string | null = null;
      if (pin) {
        const { data: inserted, error: insErr } = await supabase
          .from("funcionarios")
          .insert({
            nome,
            role: papel?.chave ?? "sala",
            role_id: role_id ?? null,
            unidade_id: unidade_id ?? null,
            ativo: true,
          })
          .select("id")
          .single();
        if (insErr || !inserted) {
          console.error("insert funcionario error:", insErr);
          return json({ error: "Erro ao criar pessoa" }, 500);
        }
        funcionarioId = inserted.id;
        const { error: pinErr } = await supabase.rpc("set_employee_pin", { p_id: funcionarioId, p_pin: pin });
        if (pinErr) {
          await supabase.from("funcionarios").delete().eq("id", funcionarioId);
          return json({ error: "Erro ao definir PIN" }, 500);
        }
      }

      if (email) {
        const { data: created, error: cErr } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          app_metadata: {
            nome,
            unidade_id: unidade_id ?? null,
            ...(funcionarioId ? { funcionario_id: funcionarioId, role: papel?.chave ?? null } : { role: papel?.chave ?? null }),
          },
          user_metadata: { nome },
        });
        if (cErr || !created?.user) {
          return json({ error: cErr?.message ?? "Erro ao criar conta de gestão" }, 400);
        }
        if (role_id) {
          await supabase.from("user_roles").insert({
            user_id: created.user.id,
            role: papel?.chave ?? "sala",
            role_id,
          });
        }
      }

      return json({ success: true, funcionario_id: funcionarioId });
    }

    if (action === "pessoa_update") {
      const { funcionario_id, user_id, nome, role_id, unidade_id } = body;
      if (!funcionario_id && !user_id) return json({ error: "Pessoa inválida" }, 400);
      const papel = role_id ? await getRoleById(role_id) : null;

      if (funcionario_id) {
        await supabase
          .from("funcionarios")
          .update({
            ...(nome ? { nome } : {}),
            ...(role_id ? { role_id, role: papel?.chave ?? "sala" } : {}),
            unidade_id: unidade_id ?? null,
          })
          .eq("id", funcionario_id);
      }

      const conta = user_id
        ? (await supabase.auth.admin.getUserById(user_id)).data?.user
        : funcionario_id
          ? await findAuthUserByFuncionario(funcionario_id)
          : null;

      if (conta) {
        const meta = (conta.app_metadata ?? {}) as Record<string, unknown>;
        await supabase.auth.admin.updateUserById(conta.id, {
          app_metadata: {
            ...meta,
            nome: nome ?? meta.nome ?? null,
            unidade_id: unidade_id ?? null,
            ...(papel ? { role: papel.chave } : {}),
          },
          user_metadata: { nome: nome ?? null },
        });
        if (role_id) {
          const gId = await gerenciaRoleId();
          const { data: atual } = await supabase.from("user_roles").select("role_id").eq("user_id", conta.id).maybeSingle();
          if (gId && atual?.role_id === gId && role_id !== gId && (await contarGerencia()) <= 1) {
            return json({ error: "Não pode remover o último papel de Gerência" }, 400);
          }
          await supabase.from("user_roles").delete().eq("user_id", conta.id);
          await supabase.from("user_roles").insert({ user_id: conta.id, role: papel?.chave ?? "sala", role_id });
        }
      }

      return json({ success: true });
    }

    if (action === "pessoa_set_pin") {
      const { funcionario_id, nome, role_id, unidade_id, pin } = body;
      if (!validatePin(pin)) return json({ error: "PIN deve ter 4-6 dígitos" }, 400);
      let fid = funcionario_id as string | undefined;
      if (await pinInUse(pin, fid)) return json({ error: "Já existe alguém com este PIN" }, 409);

      if (!fid) {
        const papel = role_id ? await getRoleById(role_id) : null;
        const { data: inserted, error: insErr } = await supabase
          .from("funcionarios")
          .insert({ nome, role: papel?.chave ?? "sala", role_id: role_id ?? null, unidade_id: unidade_id ?? null, ativo: true })
          .select("id")
          .single();
        if (insErr || !inserted) return json({ error: "Erro ao criar acesso por PIN" }, 500);
        fid = inserted.id;
      }
      const { error } = await supabase.rpc("set_employee_pin", { p_id: fid, p_pin: pin });
      if (error) return json({ error: "Erro ao definir PIN" }, 500);
      return json({ success: true, funcionario_id: fid });
    }

    if (action === "pessoa_set_password") {
      const { user_id, password } = body;
      if (!user_id || !password || String(password).length < 8) {
        return json({ error: "Password de pelo menos 8 caracteres" }, 400);
      }
      const { error } = await supabase.auth.admin.updateUserById(user_id, { password });
      if (error) return json({ error: "Erro ao redefinir password" }, 500);
      return json({ success: true });
    }

    if (action === "pessoa_add_conta") {
      const { funcionario_id, email, password, nome, unidade_id, role_id } = body;
      if (!funcionario_id || !email || !password || String(password).length < 8) {
        return json({ error: "Email e password (mín. 8 caracteres) obrigatórios" }, 400);
      }
      const papel = role_id ? await getRoleById(role_id) : null;
      const { data: created, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: { nome: nome ?? null, unidade_id: unidade_id ?? null, funcionario_id, role: papel?.chave ?? null },
        user_metadata: { nome: nome ?? null },
      });
      if (error || !created?.user) return json({ error: error?.message ?? "Erro ao criar conta" }, 400);
      if (role_id) {
        await supabase.from("user_roles").insert({ user_id: created.user.id, role: papel?.chave ?? "sala", role_id });
      }
      return json({ success: true });
    }

    if (action === "pessoa_set_active") {
      const { funcionario_id, user_id, ativo } = body;
      if (typeof ativo !== "boolean") return json({ error: "Dados incompletos" }, 400);
      if (!ativo && user_id && user_id === userData.user.id) {
        return json({ error: "Não pode desativar a própria conta" }, 400);
      }
      if (!ativo) {
        const gId = await gerenciaRoleId();
        let eGerencia = false;
        if (gId && funcionario_id) {
          const { data: f } = await supabase.from("funcionarios").select("role_id").eq("id", funcionario_id).maybeSingle();
          eGerencia = f?.role_id === gId;
        }
        if (gId && user_id && !eGerencia) {
          const { data: ur } = await supabase.from("user_roles").select("role_id").eq("user_id", user_id).maybeSingle();
          eGerencia = ur?.role_id === gId;
        }
        if (eGerencia && (await contarGerencia()) <= 1) {
          return json({ error: "É a última pessoa com papel de Gerência" }, 400);
        }
      }

      if (funcionario_id) {
        await supabase.from("funcionarios").update({ ativo }).eq("id", funcionario_id);
      }
      const conta = user_id
        ? { id: user_id }
        : funcionario_id
          ? await findAuthUserByFuncionario(funcionario_id)
          : null;
      if (conta) {
        await supabase.auth.admin.updateUserById(conta.id, { ban_duration: ativo ? "none" : "876000h" });
      }
      return json({ success: true });
    }

    if (action === "pessoa_delete") {
      const { funcionario_id, user_id, nome } = body;
      if (user_id && user_id === userData.user.id) return json({ error: "Não pode apagar a própria conta" }, 400);
      const gId = await gerenciaRoleId();
      let eGerencia = false;
      if (gId && funcionario_id) {
        const { data: f } = await supabase.from("funcionarios").select("role_id").eq("id", funcionario_id).maybeSingle();
        eGerencia = f?.role_id === gId;
      }
      if (gId && user_id && !eGerencia) {
        const { data: ur } = await supabase.from("user_roles").select("role_id").eq("user_id", user_id).maybeSingle();
        eGerencia = ur?.role_id === gId;
      }
      if (eGerencia && (await contarGerencia()) <= 1) {
        return json({ error: "É a última pessoa com papel de Gerência" }, 400);
      }
      if (nome && (await temRegistosOperacionais(nome))) {
        return json({ error: "Tem registos operacionais associados. Desative em vez de apagar.", suggest_deactivate: true }, 409);
      }
      const conta = user_id
        ? { id: user_id }
        : funcionario_id
          ? await findAuthUserByFuncionario(funcionario_id)
          : null;
      if (conta) {
        await supabase.from("user_roles").delete().eq("user_id", conta.id);
        await supabase.auth.admin.deleteUser(conta.id);
      }
      if (funcionario_id) {
        await supabase.from("funcionarios").delete().eq("id", funcionario_id);
      }
      return json({ success: true });
    }

    // ================= Papéis e permissões =================

    if (action === "roles_list") {
      const { data: rolesData, error } = await supabase
        .from("roles")
        .select("id, nome, chave, descricao, ativo, is_base")
        .order("is_base", { ascending: false })
        .order("nome");
      if (error) return json({ error: "Erro ao listar papéis" }, 500);
      const { data: perms } = await supabase.from("permissoes").select("id, chave, descricao").order("chave");
      const { data: rp } = await supabase.from("role_permissoes_v2").select("role_id, permissao_id");
      return json({ data: rolesData ?? [], permissoes: perms ?? [], role_permissoes: rp ?? [] });
    }

    if (action === "role_create") {
      const { nome, chave, descricao, permissoes } = body;
      if (!nome || !chave) return json({ error: "Nome e chave obrigatórios" }, 400);
      if (!/^[a-z0-9_]+$/.test(String(chave))) return json({ error: "Chave só pode ter letras minúsculas, números e _" }, 400);
      const { data: created, error } = await supabase
        .from("roles")
        .insert({ nome, chave, descricao: descricao ?? null, ativo: true, is_base: false })
        .select("id")
        .single();
      if (error || !created) return json({ error: error?.message ?? "Erro ao criar papel" }, 400);
      if (Array.isArray(permissoes) && permissoes.length > 0) {
        await supabase
          .from("role_permissoes_v2")
          .insert(permissoes.map((p: string) => ({ role_id: created.id, permissao_id: p })));
      }
      return json({ success: true, id: created.id });
    }

    if (action === "role_update") {
      const { id, nome, chave, descricao, ativo } = body;
      if (!id) return json({ error: "ID obrigatório" }, 400);
      const papel = await getRoleById(id);
      if (!papel) return json({ error: "Papel não encontrado" }, 404);
      const patch: Record<string, unknown> = {};
      if (nome) patch.nome = nome;
      if (descricao !== undefined) patch.descricao = descricao;
      if (typeof ativo === "boolean") patch.ativo = ativo;
      if (chave && chave !== papel.chave) {
        if (papel.is_base) return json({ error: "Não pode alterar a chave de um papel base" }, 400);
        if (!/^[a-z0-9_]+$/.test(String(chave))) return json({ error: "Chave inválida" }, 400);
        patch.chave = chave;
      }
      const { error } = await supabase.from("roles").update(patch).eq("id", id);
      if (error) return json({ error: "Erro ao atualizar papel" }, 500);
      return json({ success: true });
    }

    if (action === "role_set_permissoes") {
      const { id, permissoes } = body;
      if (!id || !Array.isArray(permissoes)) return json({ error: "Dados incompletos" }, 400);
      await supabase.from("role_permissoes_v2").delete().eq("role_id", id);
      if (permissoes.length > 0) {
        const { error } = await supabase
          .from("role_permissoes_v2")
          .insert(permissoes.map((p: string) => ({ role_id: id, permissao_id: p })));
        if (error) return json({ error: "Erro ao guardar permissões" }, 500);
      }
      return json({ success: true });
    }

    if (action === "role_delete") {
      const { id } = body;
      if (!id) return json({ error: "ID obrigatório" }, 400);
      const papel = await getRoleById(id);
      if (!papel) return json({ error: "Papel não encontrado" }, 404);
      if (papel.is_base) return json({ error: "Papéis base não podem ser apagados" }, 400);
      const { count: usos } = await supabase
        .from("user_roles")
        .select("user_id", { count: "exact", head: true })
        .eq("role_id", id);
      const { count: usosF } = await supabase
        .from("funcionarios")
        .select("id", { count: "exact", head: true })
        .eq("role_id", id);
      if ((usos ?? 0) + (usosF ?? 0) > 0) {
        return json({ error: "Este papel está atribuído a pessoas. Remova-o primeiro." }, 409);
      }
      await supabase.from("role_permissoes_v2").delete().eq("role_id", id);
      const { error } = await supabase.from("roles").delete().eq("id", id);
      if (error) return json({ error: "Erro ao apagar papel" }, 500);
      return json({ success: true });
    }

    return json({ error: "Ação desconhecida" }, 400);

  } catch (e) {
    console.error("manage-employees error:", e);
    return json({ error: "Erro interno" }, 500);
  }
});
