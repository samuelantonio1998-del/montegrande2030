ALTER TABLE public.ementa_diaria ADD COLUMN IF NOT EXISTS oculto boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS gerencia_delete_ementa_diaria ON public.ementa_diaria;
CREATE POLICY ementa_delete_com_permissao ON public.ementa_diaria
  FOR DELETE TO authenticated
  USING (public.is_gerencia() OR public.tem_permissao('cozinha.ementa.definir'));