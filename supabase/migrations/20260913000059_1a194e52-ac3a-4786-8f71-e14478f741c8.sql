CREATE TABLE public.zonas_producao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id uuid REFERENCES public.unidades(id) ON DELETE CASCADE,
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zonas_producao TO authenticated;
GRANT ALL ON public.zonas_producao TO service_role;
ALTER TABLE public.zonas_producao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "zonas_select" ON public.zonas_producao FOR SELECT TO authenticated USING (true);
CREATE POLICY "zonas_write" ON public.zonas_producao FOR ALL TO authenticated
  USING (public.tem_permissao('gestao.unidades.gerir')) WITH CHECK (public.tem_permissao('gestao.unidades.gerir'));
CREATE TRIGGER update_zonas_producao_updated_at BEFORE UPDATE ON public.zonas_producao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.equipamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id uuid REFERENCES public.unidades(id) ON DELETE CASCADE,
  zona_id uuid REFERENCES public.zonas_producao(id) ON DELETE SET NULL,
  nome text NOT NULL,
  tipo text,
  capacidade text,
  notas text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipamentos TO authenticated;
GRANT ALL ON public.equipamentos TO service_role;
ALTER TABLE public.equipamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "equipamentos_select" ON public.equipamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "equipamentos_write" ON public.equipamentos FOR ALL TO authenticated
  USING (public.tem_permissao('gestao.unidades.gerir')) WITH CHECK (public.tem_permissao('gestao.unidades.gerir'));
CREATE TRIGGER update_equipamentos_updated_at BEFORE UPDATE ON public.equipamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ficha_passos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_id uuid NOT NULL REFERENCES public.fichas_tecnicas(id) ON DELETE CASCADE,
  ordem integer NOT NULL,
  descricao text NOT NULL,
  tipo_passo text NOT NULL DEFAULT 'ativo' CHECK (tipo_passo IN ('ativo','espera')),
  operacao text CHECK (operacao IN ('lavar','descascar','laminar','cubos','juliana','cozer','saltear','arrefecer','escorrer','misturar','temperar','montar')),
  zona_id uuid REFERENCES public.zonas_producao(id) ON DELETE SET NULL,
  equipamento_id uuid REFERENCES public.equipamentos(id) ON DELETE SET NULL,
  duracao_fixa_min numeric NOT NULL DEFAULT 0,
  duracao_por_kg_min numeric NOT NULL DEFAULT 0,
  adiantavel boolean NOT NULL DEFAULT false,
  depende_de uuid REFERENCES public.ficha_passos(id) ON DELETE SET NULL,
  estimado boolean NOT NULL DEFAULT true,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ficha_id, ordem) DEFERRABLE INITIALLY DEFERRED
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ficha_passos TO authenticated;
GRANT ALL ON public.ficha_passos TO service_role;
ALTER TABLE public.ficha_passos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ficha_passos_select" ON public.ficha_passos FOR SELECT TO authenticated USING (true);
CREATE POLICY "ficha_passos_write" ON public.ficha_passos FOR ALL TO authenticated
  USING (public.tem_permissao('gestao.fichas_tecnicas.editar')) WITH CHECK (public.tem_permissao('gestao.fichas_tecnicas.editar'));
CREATE TRIGGER update_ficha_passos_updated_at BEFORE UPDATE ON public.ficha_passos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_ficha_passos_ficha ON public.ficha_passos(ficha_id, ordem);