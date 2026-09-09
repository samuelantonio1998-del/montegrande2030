-- 1. Fix is_gerencia(): read real role from user_roles.role_id -> roles.chave
CREATE OR REPLACE FUNCTION public.is_gerencia()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id AND r.ativo
    WHERE ur.user_id = auth.uid() AND r.chave = 'gerencia'
  );
$$;

-- 2. is_staff(): any authenticated user
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$ SELECT auth.uid() IS NOT NULL $$;

-- 3. Drop unused legacy JWT-claim role helper
DROP FUNCTION IF EXISTS public.app_role();

-- 4. Remove duplicate/overly-permissive legacy policies on ficha_rotulos
DROP POLICY IF EXISTS rotulos_del ON public.ficha_rotulos;
DROP POLICY IF EXISTS rotulos_ins ON public.ficha_rotulos;
DROP POLICY IF EXISTS rotulos_sel ON public.ficha_rotulos;
DROP POLICY IF EXISTS rotulos_upd ON public.ficha_rotulos;

-- 5. Permission-based deletes (gerencia keeps full access)
DROP POLICY IF EXISTS gerencia_delete_buffet_items ON public.buffet_items;
CREATE POLICY buffet_items_delete ON public.buffet_items FOR DELETE TO authenticated
  USING (is_gerencia() OR tem_permissao('cozinha.ementa.definir'));

DROP POLICY IF EXISTS gerencia_delete_tarefas ON public.tarefas;
CREATE POLICY tarefas_delete ON public.tarefas FOR DELETE TO authenticated
  USING (is_gerencia() OR tem_permissao('cozinha.tarefas.definir') OR tem_permissao('cozinha.tarefas.executar'));

DROP POLICY IF EXISTS gerencia_delete_registos_producao ON public.registos_producao;
CREATE POLICY registos_producao_delete ON public.registos_producao FOR DELETE TO authenticated
  USING (is_gerencia() OR tem_permissao('cozinha.producao.registar'));

DROP POLICY IF EXISTS gerencia_delete_produtos ON public.produtos;
CREATE POLICY produtos_delete ON public.produtos FOR DELETE TO authenticated
  USING (is_gerencia() OR tem_permissao('gestao.inventario.gerir'));

DROP POLICY IF EXISTS gerencia_delete_movimentacoes ON public.movimentacoes;
CREATE POLICY movimentacoes_delete ON public.movimentacoes FOR DELETE TO authenticated
  USING (is_gerencia() OR tem_permissao('gestao.inventario.gerir'));

DROP POLICY IF EXISTS gerencia_delete_produto_aliases ON public.produto_aliases;
CREATE POLICY produto_aliases_delete ON public.produto_aliases FOR DELETE TO authenticated
  USING (is_gerencia() OR tem_permissao('gestao.inventario.gerir'));

DROP POLICY IF EXISTS gerencia_delete_faturas_processadas ON public.faturas_processadas;
CREATE POLICY faturas_processadas_delete ON public.faturas_processadas FOR DELETE TO authenticated
  USING (is_gerencia() OR tem_permissao('gestao.inventario.gerir'));

DROP POLICY IF EXISTS gerencia_delete_fichas_tecnicas ON public.fichas_tecnicas;
CREATE POLICY fichas_tecnicas_delete ON public.fichas_tecnicas FOR DELETE TO authenticated
  USING (is_gerencia() OR tem_permissao('gestao.fichas_tecnicas.editar'));

DROP POLICY IF EXISTS gerencia_delete_ficha_ingredientes ON public.ficha_ingredientes;
CREATE POLICY ficha_ingredientes_delete ON public.ficha_ingredientes FOR DELETE TO authenticated
  USING (is_gerencia() OR tem_permissao('gestao.fichas_tecnicas.editar'));

DROP POLICY IF EXISTS ficha_rotulos_delete ON public.ficha_rotulos;
CREATE POLICY ficha_rotulos_delete ON public.ficha_rotulos FOR DELETE TO authenticated
  USING (is_gerencia() OR tem_permissao('gestao.fichas_tecnicas.editar'));

DROP POLICY IF EXISTS gerencia_delete_fornecedores ON public.fornecedores;
CREATE POLICY fornecedores_delete ON public.fornecedores FOR DELETE TO authenticated
  USING (is_gerencia() OR tem_permissao('gestao.fornecedores.ver'));

DROP POLICY IF EXISTS gerencia_delete_precario_bebidas ON public.precario_bebidas;
CREATE POLICY precario_bebidas_delete ON public.precario_bebidas FOR DELETE TO authenticated
  USING (is_gerencia() OR tem_permissao('gestao.precario.ver'));

DROP POLICY IF EXISTS gerencia_delete_precario_takeaway ON public.precario_takeaway;
CREATE POLICY precario_takeaway_delete ON public.precario_takeaway FOR DELETE TO authenticated
  USING (is_gerencia() OR tem_permissao('gestao.precario.ver'));

DROP POLICY IF EXISTS gerencia_delete_configuracao_precos ON public.configuracao_precos;
CREATE POLICY configuracao_precos_delete ON public.configuracao_precos FOR DELETE TO authenticated
  USING (is_gerencia() OR tem_permissao('gestao.precario.ver'));

DROP POLICY IF EXISTS gerencia_delete_mesas ON public.mesas;
CREATE POLICY mesas_delete ON public.mesas FOR DELETE TO authenticated
  USING (is_gerencia() OR tem_permissao('sala.mesas.cancelar'));

-- 6. fecho_mesas: sala precisa de ler/gravar os seus fechos
DROP POLICY IF EXISTS gerencia_select_fecho_mesas ON public.fecho_mesas;
CREATE POLICY fecho_mesas_select ON public.fecho_mesas FOR SELECT TO authenticated
  USING (is_gerencia() OR tem_permissao('sala.mesas.ver') OR tem_permissao('cozinha.previsao.ver'));
DROP POLICY IF EXISTS gerencia_update_fecho_mesas ON public.fecho_mesas;
CREATE POLICY fecho_mesas_update ON public.fecho_mesas FOR UPDATE TO authenticated
  USING (is_gerencia() OR tem_permissao('sala.mesas.ver'))
  WITH CHECK (is_gerencia() OR tem_permissao('sala.mesas.ver'));
DROP POLICY IF EXISTS gerencia_delete_fecho_mesas ON public.fecho_mesas;
CREATE POLICY fecho_mesas_delete ON public.fecho_mesas FOR DELETE TO authenticated
  USING (is_gerencia() OR tem_permissao('sala.mesas.cancelar'));

-- 7. vendas_historico: previsão precisa de ler
DROP POLICY IF EXISTS gerencia_select_vendas_historico ON public.vendas_historico;
CREATE POLICY vendas_historico_select ON public.vendas_historico FOR SELECT TO authenticated
  USING (is_gerencia() OR tem_permissao('cozinha.previsao.ver') OR tem_permissao('app.dashboard.ver'));
DROP POLICY IF EXISTS gerencia_update_vendas_historico ON public.vendas_historico;
CREATE POLICY vendas_historico_update ON public.vendas_historico FOR UPDATE TO authenticated
  USING (is_gerencia() OR tem_permissao('cozinha.previsao.ver'))
  WITH CHECK (is_gerencia() OR tem_permissao('cozinha.previsao.ver'));
DROP POLICY IF EXISTS gerencia_delete_vendas_historico ON public.vendas_historico;
CREATE POLICY vendas_historico_delete ON public.vendas_historico FOR DELETE TO authenticated
  USING (is_gerencia() OR tem_permissao('cozinha.previsao.ver'));

-- 8. funcionarios: gestão de pessoas por permissão
DROP POLICY IF EXISTS gerencia_select_funcionarios ON public.funcionarios;
CREATE POLICY funcionarios_select ON public.funcionarios FOR SELECT TO authenticated
  USING (is_gerencia() OR tem_permissao('gestao.funcionarios.gerir'));
DROP POLICY IF EXISTS gerencia_insert_funcionarios ON public.funcionarios;
CREATE POLICY funcionarios_insert ON public.funcionarios FOR INSERT TO authenticated
  WITH CHECK (is_gerencia() OR tem_permissao('gestao.funcionarios.gerir'));
DROP POLICY IF EXISTS gerencia_update_funcionarios ON public.funcionarios;
CREATE POLICY funcionarios_update ON public.funcionarios FOR UPDATE TO authenticated
  USING (is_gerencia() OR tem_permissao('gestao.funcionarios.gerir'))
  WITH CHECK (is_gerencia() OR tem_permissao('gestao.funcionarios.gerir'));
DROP POLICY IF EXISTS gerencia_delete_funcionarios ON public.funcionarios;
CREATE POLICY funcionarios_delete ON public.funcionarios FOR DELETE TO authenticated
  USING (is_gerencia() OR tem_permissao('gestao.funcionarios.gerir'));

-- 9. feedback / activity_logs: gestão por permissão de pessoas
DROP POLICY IF EXISTS gerencia_select_feedback ON public.feedback;
CREATE POLICY feedback_select ON public.feedback FOR SELECT TO authenticated
  USING (is_gerencia() OR tem_permissao('gestao.funcionarios.gerir'));
DROP POLICY IF EXISTS gerencia_update_feedback ON public.feedback;
CREATE POLICY feedback_update ON public.feedback FOR UPDATE TO authenticated
  USING (is_gerencia() OR tem_permissao('gestao.funcionarios.gerir'))
  WITH CHECK (is_gerencia() OR tem_permissao('gestao.funcionarios.gerir'));
DROP POLICY IF EXISTS gerencia_delete_feedback ON public.feedback;
CREATE POLICY feedback_delete ON public.feedback FOR DELETE TO authenticated
  USING (is_gerencia());

DROP POLICY IF EXISTS gerencia_select_activity_logs ON public.activity_logs;
CREATE POLICY activity_logs_select ON public.activity_logs FOR SELECT TO authenticated
  USING (is_gerencia() OR tem_permissao('gestao.funcionarios.gerir'));
