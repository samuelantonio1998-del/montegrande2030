ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS unidade_anterior text,
  ADD COLUMN IF NOT EXISTS unidade_alterada_em timestamptz,
  ADD COLUMN IF NOT EXISTS unidade_alterada_por text,
  ADD COLUMN IF NOT EXISTS unidade_fator_conversao numeric;