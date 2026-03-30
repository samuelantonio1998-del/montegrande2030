
-- Daily menu table: which items are on today's menu with predictions
CREATE TABLE public.ementa_diaria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL,
  buffet_item_id UUID NOT NULL REFERENCES public.buffet_items(id) ON DELETE CASCADE,
  quantidade_prevista NUMERIC NOT NULL DEFAULT 0,
  recipiente_sugerido TEXT NOT NULL DEFAULT 'couvete_media',
  historico_consumo_kg NUMERIC[] DEFAULT '{}',
  historico_sobra_kg NUMERIC[] DEFAULT '{}',
  notas TEXT,
  criado_por TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(data, buffet_item_id)
);

ALTER TABLE public.ementa_diaria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view ementa_diaria"
  ON public.ementa_diaria FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage ementa_diaria"
  ON public.ementa_diaria FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add realtime for live updates between management and kitchen
ALTER PUBLICATION supabase_realtime ADD TABLE public.ementa_diaria;
