-- Allow updating movimentacoes records
CREATE POLICY "Anon can update movimentacoes" ON public.movimentacoes FOR UPDATE TO anon USING (true);
CREATE POLICY "Authenticated users can update movimentacoes" ON public.movimentacoes FOR UPDATE TO authenticated USING (true);