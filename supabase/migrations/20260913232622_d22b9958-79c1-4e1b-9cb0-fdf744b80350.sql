CREATE TABLE public.plano_dia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id uuid REFERENCES public.unidades(id),
  data date NOT NULL,
  estado text NOT NULL DEFAULT 'gerado',
  abertura time,
  avisos jsonb NOT NULL DEFAULT '[]'::jsonb,
  resumo jsonb NOT NULL DEFAULT '{}'::jsonb,
  gerado_por text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (unidade_id, data)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plano_dia TO authenticated;
GRANT ALL ON public.plano_dia TO service_role;
ALTER TABLE public.plano_dia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plano_dia_select" ON public.plano_dia FOR SELECT TO authenticated USING (true);
CREATE POLICY "plano_dia_insert" ON public.plano_dia FOR INSERT TO authenticated WITH CHECK (public.tem_permissao('cozinha.plano.gerir'));
CREATE POLICY "plano_dia_update" ON public.plano_dia FOR UPDATE TO authenticated USING (public.tem_permissao('cozinha.plano.gerir')) WITH CHECK (public.tem_permissao('cozinha.plano.gerir'));
CREATE POLICY "plano_dia_delete" ON public.plano_dia FOR DELETE TO authenticated USING (public.tem_permissao('cozinha.plano.gerir'));

CREATE TRIGGER update_plano_dia_updated_at BEFORE UPDATE ON public.plano_dia
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.plano_tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id uuid NOT NULL REFERENCES public.plano_dia(id) ON DELETE CASCADE,
  ordem integer NOT NULL DEFAULT 0,
  descricao text NOT NULL,
  operacao text,
  tipo_passo text NOT NULL DEFAULT 'ativo',
  zona_id uuid REFERENCES public.zonas_producao(id),
  equipamento_id uuid REFERENCES public.equipamentos(id),
  fichas jsonb NOT NULL DEFAULT '[]'::jsonb,
  kg numeric NOT NULL DEFAULT 0,
  duracao_min numeric NOT NULL DEFAULT 0,
  inicio_min integer,
  fim_min integer,
  funcionario_id uuid REFERENCES public.funcionarios(id),
  vespera boolean NOT NULL DEFAULT false,
  adiantavel boolean NOT NULL DEFAULT false,
  concluida boolean NOT NULL DEFAULT false,
  concluida_em timestamptz,
  concluida_por text,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plano_tarefas TO authenticated;
GRANT ALL ON public.plano_tarefas TO service_role;
ALTER TABLE public.plano_tarefas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plano_tarefas_select" ON public.plano_tarefas FOR SELECT TO authenticated USING (true);
CREATE POLICY "plano_tarefas_insert" ON public.plano_tarefas FOR INSERT TO authenticated WITH CHECK (public.tem_permissao('cozinha.plano.gerir'));
CREATE POLICY "plano_tarefas_update" ON public.plano_tarefas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "plano_tarefas_delete" ON public.plano_tarefas FOR DELETE TO authenticated USING (public.tem_permissao('cozinha.plano.gerir'));

CREATE TRIGGER update_plano_tarefas_updated_at BEFORE UPDATE ON public.plano_tarefas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_plano_tarefas_plano ON public.plano_tarefas(plano_id);
CREATE INDEX idx_plano_dia_unidade_data ON public.plano_dia(unidade_id, data);