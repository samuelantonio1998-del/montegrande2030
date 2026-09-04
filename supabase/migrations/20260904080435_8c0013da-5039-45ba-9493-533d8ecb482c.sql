CREATE POLICY "funcionario_select_proprio" ON public.funcionarios
FOR SELECT TO authenticated
USING (id = ((auth.jwt() -> 'app_metadata' ->> 'funcionario_id'))::uuid);