CREATE TABLE public.ficha_rotulos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_id uuid NOT NULL UNIQUE REFERENCES public.fichas_tecnicas(id) ON DELETE CASCADE,
  titulo text,
  modo_preparacao text,
  ingredientes text,
  nutricional text,
  alergenios text,
  conservacao text,
  peso text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ficha_rotulos TO authenticated;
GRANT ALL ON public.ficha_rotulos TO service_role;

ALTER TABLE public.ficha_rotulos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ficha_rotulos_select" ON public.ficha_rotulos FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY "ficha_rotulos_insert" ON public.ficha_rotulos FOR INSERT TO authenticated WITH CHECK (public.is_staff());
CREATE POLICY "ficha_rotulos_update" ON public.ficha_rotulos FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "ficha_rotulos_delete" ON public.ficha_rotulos FOR DELETE TO authenticated USING (public.is_gerencia());

CREATE TRIGGER update_ficha_rotulos_updated_at
BEFORE UPDATE ON public.ficha_rotulos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();