CREATE TABLE public.produtos_stock_backup (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  stock_minimo_antigo numeric NOT NULL,
  stock_maximo_antigo numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.produtos_stock_backup TO authenticated;
GRANT ALL ON public.produtos_stock_backup TO service_role;

ALTER TABLE public.produtos_stock_backup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver backup de stock com permissao de inventario"
ON public.produtos_stock_backup FOR SELECT TO authenticated
USING (public.tem_permissao('inventario.gerir') OR public.is_gerencia());

CREATE POLICY "Criar backup de stock com permissao de inventario"
ON public.produtos_stock_backup FOR INSERT TO authenticated
WITH CHECK (public.tem_permissao('inventario.gerir') OR public.is_gerencia());

CREATE INDEX idx_produtos_stock_backup_produto ON public.produtos_stock_backup(produto_id);