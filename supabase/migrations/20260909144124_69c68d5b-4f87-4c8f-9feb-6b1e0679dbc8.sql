CREATE OR REPLACE FUNCTION public.verify_employee_pin(p_pin text)
RETURNS TABLE(id uuid, nome text, role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT f.id, f.nome, f.role
    FROM public.funcionarios f
   WHERE f.ativo = TRUE
     AND f.pin_hash IS NOT NULL
     AND f.pin_hash = crypt(p_pin, f.pin_hash);
$$;