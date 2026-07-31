CREATE OR REPLACE FUNCTION public.set_employee_pin(p_id uuid, p_pin text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF p_pin IS NULL OR length(p_pin) < 4 OR length(p_pin) > 6 OR p_pin !~ '^\d+$' THEN
    RAISE EXCEPTION 'PIN inválido';
  END IF;
  UPDATE public.funcionarios
     SET pin_hash = crypt(p_pin, gen_salt('bf', 10))
   WHERE id = p_id;
END;
$function$;