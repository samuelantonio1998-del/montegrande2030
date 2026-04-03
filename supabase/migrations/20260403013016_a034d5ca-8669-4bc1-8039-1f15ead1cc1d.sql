
-- 1. Tarefas (unifica tasks, checklist, service orders)
CREATE TABLE public.tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  categoria text NOT NULL DEFAULT 'outro',
  responsavel text NOT NULL DEFAULT '',
  prioridade text NOT NULL DEFAULT 'media',
  critica boolean NOT NULL DEFAULT false,
  concluida boolean NOT NULL DEFAULT false,
  periodicidade text NOT NULL DEFAULT 'unica',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tarefas" ON public.tarefas FOR SELECT USING (true);
CREATE POLICY "Anyone can insert tarefas" ON public.tarefas FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update tarefas" ON public.tarefas FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete tarefas" ON public.tarefas FOR DELETE USING (true);

-- 2. Registos de Produção
CREATE TABLE public.registos_producao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dish_name text NOT NULL,
  ficha_tecnica_id uuid REFERENCES public.fichas_tecnicas(id) ON DELETE SET NULL,
  buffet_item_id uuid REFERENCES public.buffet_items(id) ON DELETE SET NULL,
  recipiente text NOT NULL DEFAULT 'couvete_media',
  peso_kg numeric NOT NULL DEFAULT 0,
  enviado_at timestamptz NOT NULL DEFAULT now(),
  recolhido_at timestamptz,
  estado text NOT NULL DEFAULT 'no_buffet',
  sobra_kg numeric,
  sobra_acao text,
  aproveitamento_nota text,
  registado_por text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.registos_producao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view registos_producao" ON public.registos_producao FOR SELECT USING (true);
CREATE POLICY "Anyone can insert registos_producao" ON public.registos_producao FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update registos_producao" ON public.registos_producao FOR UPDATE USING (true);

-- 3. Preçário de Bebidas
CREATE TABLE public.precario_bebidas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  preco numeric NOT NULL DEFAULT 0,
  categoria text NOT NULL DEFAULT 'Diversos',
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.precario_bebidas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view precario_bebidas" ON public.precario_bebidas FOR SELECT USING (true);
CREATE POLICY "Anyone can insert precario_bebidas" ON public.precario_bebidas FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update precario_bebidas" ON public.precario_bebidas FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete precario_bebidas" ON public.precario_bebidas FOR DELETE USING (true);

-- 4. Configuração de Preços de Refeição
CREATE TABLE public.configuracao_precos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  valor numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.configuracao_precos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view configuracao_precos" ON public.configuracao_precos FOR SELECT USING (true);
CREATE POLICY "Anyone can update configuracao_precos" ON public.configuracao_precos FOR UPDATE USING (true);
CREATE POLICY "Anyone can insert configuracao_precos" ON public.configuracao_precos FOR INSERT WITH CHECK (true);
