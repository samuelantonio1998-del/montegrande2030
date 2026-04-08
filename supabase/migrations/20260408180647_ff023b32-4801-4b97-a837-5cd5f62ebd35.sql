CREATE TABLE public.produto_aliases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  alias_nome text NOT NULL,
  alias_sku text,
  fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_produto_aliases_nome ON public.produto_aliases(alias_nome);
CREATE INDEX idx_produto_aliases_produto ON public.produto_aliases(produto_id);

ALTER TABLE public.produto_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view produto_aliases" ON public.produto_aliases FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert produto_aliases" ON public.produto_aliases FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update produto_aliases" ON public.produto_aliases FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete produto_aliases" ON public.produto_aliases FOR DELETE TO public USING (true);