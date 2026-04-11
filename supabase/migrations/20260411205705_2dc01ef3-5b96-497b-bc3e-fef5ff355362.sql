
ALTER TABLE public.precario_bebidas
  ADD COLUMN tipo_servico text NOT NULL DEFAULT 'unidade',
  ADD COLUMN dose_ml integer DEFAULT NULL,
  ADD COLUMN garrafa_ml integer DEFAULT NULL;

-- Marcar Aperitivos, Digestivos e Wisky como dose (50ml de garrafa de 750ml)
UPDATE public.precario_bebidas
SET tipo_servico = 'dose', dose_ml = 50, garrafa_ml = 750
WHERE categoria IN ('Aperitivos', 'Digestivos', 'Wisky');
