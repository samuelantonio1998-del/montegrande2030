
ALTER TABLE public.tarefas
  ADD COLUMN IF NOT EXISTS duracao_estimada_min integer NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS momento_do_dia text NOT NULL DEFAULT 'durante',
  ADD COLUMN IF NOT EXISTS hora_sugerida time without time zone;

ALTER TABLE public.tarefas DROP CONSTRAINT IF EXISTS tarefas_momento_do_dia_check;
ALTER TABLE public.tarefas ADD CONSTRAINT tarefas_momento_do_dia_check
  CHECK (momento_do_dia IN ('abertura','durante','fecho'));

UPDATE public.tarefas SET momento_do_dia = CASE categoria
  WHEN 'abertura' THEN 'abertura'
  WHEN 'fecho' THEN 'fecho'
  ELSE 'durante' END;

UPDATE public.tarefas SET duracao_estimada_min = CASE categoria
  WHEN 'abertura' THEN 20
  WHEN 'fecho' THEN 30
  WHEN 'limpeza' THEN 25
  WHEN 'manutencao' THEN 45
  ELSE 15 END;

CREATE TABLE IF NOT EXISTS public.tarefa_execucoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id uuid NOT NULL REFERENCES public.tarefas(id) ON DELETE CASCADE,
  funcionario_id uuid REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  executado_por text,
  data date NOT NULL DEFAULT (now() AT TIME ZONE 'Europe/Lisbon')::date,
  iniciado_em timestamptz NOT NULL DEFAULT now(),
  concluido_em timestamptz,
  duracao_min numeric GENERATED ALWAYS AS (
    CASE WHEN concluido_em IS NULL THEN NULL
    ELSE round(EXTRACT(EPOCH FROM (concluido_em - iniciado_em))::numeric / 60.0, 1) END
  ) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tarefa_execucoes TO authenticated;
GRANT ALL ON public.tarefa_execucoes TO service_role;
ALTER TABLE public.tarefa_execucoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exec_ver" ON public.tarefa_execucoes;
CREATE POLICY "exec_ver" ON public.tarefa_execucoes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "exec_criar" ON public.tarefa_execucoes;
CREATE POLICY "exec_criar" ON public.tarefa_execucoes FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "exec_editar" ON public.tarefa_execucoes;
CREATE POLICY "exec_editar" ON public.tarefa_execucoes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "exec_apagar" ON public.tarefa_execucoes;
CREATE POLICY "exec_apagar" ON public.tarefa_execucoes FOR DELETE TO authenticated
  USING (public.tem_permissao('tarefas.gerir'));

CREATE INDEX IF NOT EXISTS idx_tarefa_execucoes_tarefa ON public.tarefa_execucoes(tarefa_id);

DROP TRIGGER IF EXISTS trg_tarefa_execucoes_updated ON public.tarefa_execucoes;
CREATE TRIGGER trg_tarefa_execucoes_updated BEFORE UPDATE ON public.tarefa_execucoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.plano_tarefas
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'producao',
  ADD COLUMN IF NOT EXISTS tarefa_id uuid REFERENCES public.tarefas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS iniciado_em timestamptz;

ALTER TABLE public.plano_tarefas DROP CONSTRAINT IF EXISTS plano_tarefas_origem_check;
ALTER TABLE public.plano_tarefas ADD CONSTRAINT plano_tarefas_origem_check
  CHECK (origem IN ('producao','tarefa'));
