
CREATE TABLE public.vendas_historico (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data date NOT NULL UNIQUE,
  almoco integer NOT NULL DEFAULT 0,
  jantar integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  dia_festivo text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.vendas_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view vendas_historico" ON public.vendas_historico FOR SELECT USING (true);
CREATE POLICY "Anyone can insert vendas_historico" ON public.vendas_historico FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update vendas_historico" ON public.vendas_historico FOR UPDATE USING (true);

CREATE INDEX idx_vendas_historico_data ON public.vendas_historico(data);
