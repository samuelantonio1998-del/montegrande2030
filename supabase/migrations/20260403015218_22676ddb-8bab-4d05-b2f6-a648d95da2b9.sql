
CREATE TABLE public.fecho_mesas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mesa_number integer NOT NULL,
  adults integer NOT NULL DEFAULT 0,
  children2to6 integer NOT NULL DEFAULT 0,
  children7to12 integer NOT NULL DEFAULT 0,
  total_pax integer NOT NULL DEFAULT 0,
  periodo text NOT NULL DEFAULT 'almoco',
  funcionario text DEFAULT '',
  data date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fecho_mesas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view fecho_mesas" ON public.fecho_mesas FOR SELECT USING (true);
CREATE POLICY "Anyone can insert fecho_mesas" ON public.fecho_mesas FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update fecho_mesas" ON public.fecho_mesas FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete fecho_mesas" ON public.fecho_mesas FOR DELETE USING (true);
