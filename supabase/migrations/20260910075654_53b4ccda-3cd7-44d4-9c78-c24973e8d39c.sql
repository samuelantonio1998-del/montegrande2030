CREATE TABLE public.backup_saladas_fichas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_id uuid NOT NULL,
  nome text NOT NULL,
  categoria text,
  porcoes numeric,
  preco_venda numeric,
  tempo_preparacao integer,
  notas_preparacao text,
  ativo boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.backup_saladas_fichas TO authenticated;
GRANT ALL ON public.backup_saladas_fichas TO service_role;
ALTER TABLE public.backup_saladas_fichas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gerencia ve backup fichas saladas" ON public.backup_saladas_fichas FOR SELECT TO authenticated USING (public.is_gerencia());

CREATE TABLE public.backup_saladas_ingredientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_id uuid NOT NULL,
  produto_id uuid NOT NULL,
  quantidade numeric NOT NULL,
  unidade text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.backup_saladas_ingredientes TO authenticated;
GRANT ALL ON public.backup_saladas_ingredientes TO service_role;
ALTER TABLE public.backup_saladas_ingredientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gerencia ve backup ingredientes saladas" ON public.backup_saladas_ingredientes FOR SELECT TO authenticated USING (public.is_gerencia());

INSERT INTO public.backup_saladas_fichas (ficha_id, nome, categoria, porcoes, preco_venda, tempo_preparacao, notas_preparacao, ativo)
SELECT id, nome, categoria, porcoes, preco_venda, tempo_preparacao, notas_preparacao, ativo
FROM public.fichas_tecnicas
WHERE nome IN ('Salada Grega','Salada Russa','Salada Maçã e Beterraba','Salada Massa Fusili');

INSERT INTO public.backup_saladas_ingredientes (ficha_id, produto_id, quantidade, unidade)
SELECT fi.ficha_id, fi.produto_id, fi.quantidade, fi.unidade
FROM public.ficha_ingredientes fi
JOIN public.fichas_tecnicas ft ON ft.id = fi.ficha_id
WHERE ft.nome IN ('Salada Grega','Salada Russa','Salada Maçã e Beterraba','Salada Massa Fusili');