
-- Create update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fornecedores
CREATE TABLE public.fornecedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  dia_encomenda TEXT,
  prazo_entrega_dias INTEGER DEFAULT 2,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view fornecedores" ON public.fornecedores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert fornecedores" ON public.fornecedores FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update fornecedores" ON public.fornecedores FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete fornecedores" ON public.fornecedores FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_fornecedores_updated_at BEFORE UPDATE ON public.fornecedores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Produtos (Inventory items)
CREATE TABLE public.produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'geral',
  unidade TEXT NOT NULL DEFAULT 'kg',
  stock_atual NUMERIC NOT NULL DEFAULT 0,
  stock_minimo NUMERIC NOT NULL DEFAULT 0,
  stock_maximo NUMERIC NOT NULL DEFAULT 100,
  custo_medio NUMERIC NOT NULL DEFAULT 0,
  fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  sku TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view produtos" ON public.produtos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert produtos" ON public.produtos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update produtos" ON public.produtos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete produtos" ON public.produtos FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Movimentações (Stock movements: entries, exits, waste)
CREATE TABLE public.movimentacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida', 'quebra', 'ajuste')),
  quantidade NUMERIC NOT NULL,
  custo_unitario NUMERIC,
  motivo TEXT,
  funcionario TEXT,
  documento_url TEXT,
  fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.movimentacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view movimentacoes" ON public.movimentacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert movimentacoes" ON public.movimentacoes FOR INSERT TO authenticated WITH CHECK (true);

-- Fichas técnicas (recipes)
CREATE TABLE public.fichas_tecnicas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'geral',
  porcoes INTEGER NOT NULL DEFAULT 1,
  tempo_preparacao INTEGER DEFAULT 0,
  preco_venda NUMERIC NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.fichas_tecnicas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view fichas_tecnicas" ON public.fichas_tecnicas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage fichas_tecnicas" ON public.fichas_tecnicas FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_fichas_tecnicas_updated_at BEFORE UPDATE ON public.fichas_tecnicas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ingredientes das fichas técnicas
CREATE TABLE public.ficha_ingredientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ficha_id UUID NOT NULL REFERENCES public.fichas_tecnicas(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  quantidade NUMERIC NOT NULL,
  unidade TEXT NOT NULL DEFAULT 'kg'
);

ALTER TABLE public.ficha_ingredientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view ficha_ingredientes" ON public.ficha_ingredientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage ficha_ingredientes" ON public.ficha_ingredientes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Storage bucket for invoice photos
INSERT INTO storage.buckets (id, name, public) VALUES ('faturas', 'faturas', false);

CREATE POLICY "Authenticated users can upload faturas" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'faturas');
CREATE POLICY "Authenticated users can view faturas" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'faturas');
