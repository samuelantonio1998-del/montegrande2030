-- Add produto_id FK to precario_bebidas
ALTER TABLE public.precario_bebidas
ADD COLUMN produto_id uuid REFERENCES public.produtos(id) ON DELETE SET NULL;

-- Populate existing matches by name
UPDATE public.precario_bebidas pb
SET produto_id = p.id
FROM public.produtos p
WHERE LOWER(TRIM(pb.nome)) = LOWER(TRIM(p.nome))
  AND pb.produto_id IS NULL;

-- Create index for the FK
CREATE INDEX idx_precario_bebidas_produto_id ON public.precario_bebidas(produto_id);

-- Trigger: when precario_bebidas name changes, sync to produtos
CREATE OR REPLACE FUNCTION public.sync_precario_to_produto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.produto_id IS NOT NULL AND NEW.nome IS DISTINCT FROM OLD.nome THEN
    UPDATE produtos SET nome = NEW.nome, updated_at = now()
    WHERE id = NEW.produto_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_precario_to_produto
AFTER UPDATE ON public.precario_bebidas
FOR EACH ROW
EXECUTE FUNCTION public.sync_precario_to_produto();

-- Trigger: when produtos name changes, sync to precario_bebidas
CREATE OR REPLACE FUNCTION public.sync_produto_to_precario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.nome IS DISTINCT FROM OLD.nome THEN
    UPDATE precario_bebidas SET nome = NEW.nome, updated_at = now()
    WHERE produto_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_produto_to_precario
AFTER UPDATE ON public.produtos
FOR EACH ROW
EXECUTE FUNCTION public.sync_produto_to_precario();