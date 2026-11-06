CREATE TABLE public.backup_conversao_unidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela text NOT NULL,
  registo_id uuid NOT NULL,
  dados jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.backup_conversao_unidades TO authenticated;
GRANT ALL ON public.backup_conversao_unidades TO service_role;
ALTER TABLE public.backup_conversao_unidades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gerencia le backups de conversao" ON public.backup_conversao_unidades
  FOR SELECT TO authenticated USING (public.is_gerencia());