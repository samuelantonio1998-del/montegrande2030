
DROP POLICY IF EXISTS "exec_apagar" ON public.tarefa_execucoes;
CREATE POLICY "exec_apagar" ON public.tarefa_execucoes FOR DELETE TO authenticated
  USING (public.tem_permissao('cozinha.tarefas.definir'));
