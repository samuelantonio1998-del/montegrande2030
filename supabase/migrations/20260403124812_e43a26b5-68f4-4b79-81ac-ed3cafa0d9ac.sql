
CREATE TABLE public.faturas_processadas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_fatura TEXT,
  data_fatura TEXT,
  fornecedor TEXT,
  hash_identificador TEXT NOT NULL UNIQUE,
  total_itens INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.faturas_processadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view faturas_processadas" ON public.faturas_processadas FOR SELECT USING (true);
CREATE POLICY "Anyone can insert faturas_processadas" ON public.faturas_processadas FOR INSERT WITH CHECK (true);
