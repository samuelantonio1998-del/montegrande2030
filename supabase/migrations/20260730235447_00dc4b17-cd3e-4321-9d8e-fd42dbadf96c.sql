-- 1) Drop unused plaintext PIN column
ALTER TABLE public.funcionarios DROP COLUMN IF EXISTS pin;

-- 2) Lock down SECURITY DEFINER functions: only service_role / internal callers
REVOKE EXECUTE ON FUNCTION public.verify_employee_pin(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_employee_pin(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_buffet_item_from_ficha() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_precario_to_produto() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_produto_to_precario() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_wake() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.verify_employee_pin(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_employee_pin(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.email_queue_dispatch() TO service_role;

-- 3) Public storage bucket should not be listable by anonymous clients
DROP POLICY IF EXISTS "Public can view pratos" ON storage.objects;
CREATE POLICY "Authenticated users can view pratos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'pratos');