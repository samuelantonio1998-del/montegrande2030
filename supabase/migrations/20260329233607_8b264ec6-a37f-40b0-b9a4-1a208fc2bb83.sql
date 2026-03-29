
CREATE TABLE public.buffet_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  zona text NOT NULL DEFAULT 'entradas',
  ativo boolean NOT NULL DEFAULT true,
  ficha_tecnica_id uuid REFERENCES public.fichas_tecnicas(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.buffet_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view buffet_items" ON public.buffet_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage buffet_items" ON public.buffet_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_buffet_items_updated_at BEFORE UPDATE ON public.buffet_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
