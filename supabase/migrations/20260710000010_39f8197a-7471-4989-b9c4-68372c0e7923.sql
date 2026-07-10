
-- Helper functions reading role from JWT app_metadata
CREATE OR REPLACE FUNCTION public.is_gerencia()
RETURNS boolean LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'gerencia',
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT COALESCE(auth.role() = 'authenticated', false);
$$;

-- Revoke anon grants on all public tables (service_role and authenticated keep)
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
  END LOOP;
END$$;

-- Drop ALL existing policies on public tables (we're rewriting)
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname='public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END$$;

-- =========================================================
-- OPERATIONAL TABLES: authenticated CRUD, DELETE gerencia only
-- =========================================================
DO $$
DECLARE t text;
DECLARE ops text[] := ARRAY[
  'produtos','fichas_tecnicas','ficha_ingredientes','movimentacoes',
  'mesas','produto_aliases','fornecedores','faturas_processadas',
  'buffet_items','ementa_diaria','precario_bebidas','precario_takeaway',
  'registos_producao','tarefas','configuracao_precos'
];
BEGIN
  FOREACH t IN ARRAY ops LOOP
    EXECUTE format('CREATE POLICY "auth_select_%1$s" ON public.%1$I FOR SELECT TO authenticated USING (true)', t);
    EXECUTE format('CREATE POLICY "auth_insert_%1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY "auth_update_%1$s" ON public.%1$I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY "gerencia_delete_%1$s" ON public.%1$I FOR DELETE TO authenticated USING (public.is_gerencia())', t);
  END LOOP;
END$$;

-- =========================================================
-- SENSITIVE / FINANCIAL TABLES: SELECT gerencia; INSERT authenticated; UPDATE/DELETE gerencia
-- =========================================================
DO $$
DECLARE t text;
DECLARE sens text[] := ARRAY['vendas_historico','fecho_mesas','feedback','activity_logs'];
BEGIN
  FOREACH t IN ARRAY sens LOOP
    EXECUTE format('CREATE POLICY "gerencia_select_%1$s" ON public.%1$I FOR SELECT TO authenticated USING (public.is_gerencia())', t);
    EXECUTE format('CREATE POLICY "auth_insert_%1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY "gerencia_update_%1$s" ON public.%1$I FOR UPDATE TO authenticated USING (public.is_gerencia()) WITH CHECK (public.is_gerencia())', t);
    EXECUTE format('CREATE POLICY "gerencia_delete_%1$s" ON public.%1$I FOR DELETE TO authenticated USING (public.is_gerencia())', t);
  END LOOP;
END$$;

-- Service role always allowed on activity_logs INSERT (edge function log-activity)
CREATE POLICY "service_insert_activity_logs" ON public.activity_logs
  FOR INSERT TO service_role WITH CHECK (true);

-- =========================================================
-- FUNCIONARIOS: no direct client SELECT; management only via gerencia
-- =========================================================
CREATE POLICY "gerencia_select_funcionarios" ON public.funcionarios
  FOR SELECT TO authenticated USING (public.is_gerencia());
CREATE POLICY "gerencia_insert_funcionarios" ON public.funcionarios
  FOR INSERT TO authenticated WITH CHECK (public.is_gerencia());
CREATE POLICY "gerencia_update_funcionarios" ON public.funcionarios
  FOR UPDATE TO authenticated USING (public.is_gerencia()) WITH CHECK (public.is_gerencia());
CREATE POLICY "gerencia_delete_funcionarios" ON public.funcionarios
  FOR DELETE TO authenticated USING (public.is_gerencia());

-- =========================================================
-- pin_attempts, email_* , suppressed_emails: service role only
-- (no client-facing policies — RLS enabled, no policy = deny for authenticated/anon)
-- =========================================================
CREATE POLICY "service_all_pin_attempts" ON public.pin_attempts
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_email_send_log" ON public.email_send_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_email_send_state" ON public.email_send_state
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_email_unsubscribe_tokens" ON public.email_unsubscribe_tokens
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_suppressed_emails" ON public.suppressed_emails
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =========================================================
-- STORAGE: drop the public write policies on pratos bucket
-- =========================================================
DROP POLICY IF EXISTS "Anyone can upload to pratos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update pratos" ON storage.objects;
