CREATE OR REPLACE FUNCTION public.set_employee_pin(p_id uuid, p_pin text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF p_pin IS NULL OR p_pin !~ '^\d{4}$' THEN
    RAISE EXCEPTION 'PIN inválido: são necessários exatamente 4 dígitos';
  END IF;
  UPDATE public.funcionarios
     SET pin_hash = crypt(p_pin, gen_salt('bf', 10))
   WHERE id = p_id;
END;
$function$;

SELECT public.set_employee_pin(id, '5837') FROM public.funcionarios WHERE nome = 'sala1';