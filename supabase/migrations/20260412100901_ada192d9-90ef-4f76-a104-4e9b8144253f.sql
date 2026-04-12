-- =============================================
-- 1. LOCK DOWN funcionarios TABLE
-- =============================================

-- Drop all existing permissive policies
DROP POLICY IF EXISTS "Anyone can delete funcionarios" ON public.funcionarios;
DROP POLICY IF EXISTS "Anyone can insert funcionarios" ON public.funcionarios;
DROP POLICY IF EXISTS "Anyone can update funcionarios" ON public.funcionarios;
DROP POLICY IF EXISTS "Anyone can view funcionarios" ON public.funcionarios;

-- Only service_role can access funcionarios
CREATE POLICY "Service role can select funcionarios"
  ON public.funcionarios FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can insert funcionarios"
  ON public.funcionarios FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update funcionarios"
  ON public.funcionarios FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can delete funcionarios"
  ON public.funcionarios FOR DELETE
  USING (auth.role() = 'service_role');

-- =============================================
-- 2. LOCK DOWN activity_logs TABLE (append-only via service_role)
-- =============================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Anyone can delete activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Anyone can insert activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Anyone can update activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Anyone can view activity_logs" ON public.activity_logs;

-- Service role can insert (append-only)
CREATE POLICY "Service role can insert activity_logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Anyone can read logs (for dashboard display)
CREATE POLICY "Anyone can view activity_logs"
  ON public.activity_logs FOR SELECT
  USING (true);

-- No UPDATE or DELETE policies = immutable audit trail