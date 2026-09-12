CREATE TABLE public.horarios_trabalho (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id uuid NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  unidade_id uuid REFERENCES public.unidades(id),
  dia_semana smallint NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio time,
  hora_fim time,
  turno text NOT NULL DEFAULT 'unico' CHECK (turno IN ('almoco','jantar','unico')),
  alternado boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (funcionario_id, dia_semana, turno)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.horarios_trabalho TO authenticated;
GRANT ALL ON public.horarios_trabalho TO service_role;
ALTER TABLE public.horarios_trabalho ENABLE ROW LEVEL SECURITY;
CREATE POLICY "horarios_select" ON public.horarios_trabalho FOR SELECT TO authenticated USING (true);
CREATE POLICY "horarios_write" ON public.horarios_trabalho FOR ALL TO authenticated
  USING (public.tem_permissao('gestao.funcionarios.gerir')) WITH CHECK (public.tem_permissao('gestao.funcionarios.gerir'));
CREATE TRIGGER update_horarios_trabalho_updated_at BEFORE UPDATE ON public.horarios_trabalho
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.horario_excepcoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id uuid NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  unidade_id uuid REFERENCES public.unidades(id),
  data date NOT NULL,
  hora_inicio time,
  hora_fim time,
  ausente boolean NOT NULL DEFAULT false,
  motivo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.horario_excepcoes TO authenticated;
GRANT ALL ON public.horario_excepcoes TO service_role;
ALTER TABLE public.horario_excepcoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "excepcoes_select" ON public.horario_excepcoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "excepcoes_write" ON public.horario_excepcoes FOR ALL TO authenticated
  USING (public.tem_permissao('gestao.funcionarios.gerir')) WITH CHECK (public.tem_permissao('gestao.funcionarios.gerir'));
CREATE TRIGGER update_horario_excepcoes_updated_at BEFORE UPDATE ON public.horario_excepcoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.escala_alternancia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id uuid REFERENCES public.unidades(id),
  semana_inicio date NOT NULL,
  funcionario_id uuid NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  turno text NOT NULL CHECK (turno IN ('almoco','jantar')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (semana_inicio, funcionario_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.escala_alternancia TO authenticated;
GRANT ALL ON public.escala_alternancia TO service_role;
ALTER TABLE public.escala_alternancia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "escala_select" ON public.escala_alternancia FOR SELECT TO authenticated USING (true);
CREATE POLICY "escala_write" ON public.escala_alternancia FOR ALL TO authenticated
  USING (public.tem_permissao('gestao.funcionarios.gerir')) WITH CHECK (public.tem_permissao('gestao.funcionarios.gerir'));
CREATE TRIGGER update_escala_alternancia_updated_at BEFORE UPDATE ON public.escala_alternancia
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();