ALTER TABLE public.fichas_tecnicas ADD COLUMN IF NOT EXISTS peso_porcao_g numeric;

UPDATE public.fichas_tecnicas f
SET peso_porcao_g = round(t.kg_total * 1000 / NULLIF(f.porcoes, 0), 1)
FROM (
  SELECT ficha_id, SUM(quantidade) AS kg_total
  FROM public.ficha_ingredientes
  GROUP BY ficha_id
) t
WHERE t.ficha_id = f.id
  AND f.peso_porcao_g IS NULL
  AND f.porcoes > 0
  AND t.kg_total > 0;