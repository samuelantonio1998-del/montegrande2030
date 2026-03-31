
-- 1. Remove duplicate buffet_items, keeping the one with ficha_tecnica_id if exists, otherwise the oldest
DELETE FROM buffet_items
WHERE id NOT IN (
  SELECT DISTINCT ON (nome, zona) id
  FROM buffet_items
  ORDER BY nome, zona, ficha_tecnica_id NULLS LAST, created_at ASC
);

-- 2. Create trigger function to auto-create/update buffet_items when fichas_tecnicas are inserted/updated
CREATE OR REPLACE FUNCTION sync_buffet_item_from_ficha()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  zona_val text;
  existing_id uuid;
BEGIN
  -- Map categoria to zona
  CASE NEW.categoria
    WHEN 'entradas' THEN zona_val := 'entradas';
    WHEN 'pratos_principais' THEN zona_val := 'pratos_principais';
    WHEN 'sobremesas' THEN zona_val := 'sobremesas';
    ELSE zona_val := 'pratos_principais';
  END CASE;

  -- Check if buffet_item already linked to this ficha
  SELECT id INTO existing_id FROM buffet_items WHERE ficha_tecnica_id = NEW.id LIMIT 1;

  IF existing_id IS NOT NULL THEN
    -- Update existing
    UPDATE buffet_items SET nome = NEW.nome, zona = zona_val, ativo = NEW.ativo, updated_at = now()
    WHERE id = existing_id;
  ELSE
    -- Check if there's a buffet_item with same name but no ficha linked
    SELECT id INTO existing_id FROM buffet_items WHERE nome = NEW.nome AND ficha_tecnica_id IS NULL LIMIT 1;
    IF existing_id IS NOT NULL THEN
      UPDATE buffet_items SET ficha_tecnica_id = NEW.id, zona = zona_val, ativo = NEW.ativo, updated_at = now()
      WHERE id = existing_id;
    ELSE
      INSERT INTO buffet_items (nome, zona, ficha_tecnica_id, ativo)
      VALUES (NEW.nome, zona_val, NEW.id, NEW.ativo);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Create trigger
DROP TRIGGER IF EXISTS trg_sync_buffet_item ON fichas_tecnicas;
CREATE TRIGGER trg_sync_buffet_item
  AFTER INSERT OR UPDATE ON fichas_tecnicas
  FOR EACH ROW
  EXECUTE FUNCTION sync_buffet_item_from_ficha();

-- 4. Sync existing fichas_tecnicas that don't have buffet_items yet
INSERT INTO buffet_items (nome, zona, ficha_tecnica_id, ativo)
SELECT ft.nome,
  CASE ft.categoria
    WHEN 'entradas' THEN 'entradas'
    WHEN 'pratos_principais' THEN 'pratos_principais'
    WHEN 'sobremesas' THEN 'sobremesas'
    ELSE 'pratos_principais'
  END,
  ft.id,
  ft.ativo
FROM fichas_tecnicas ft
WHERE ft.id NOT IN (SELECT DISTINCT ficha_tecnica_id FROM buffet_items WHERE ficha_tecnica_id IS NOT NULL)
AND ft.ativo = true;
