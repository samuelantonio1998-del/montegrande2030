
-- Allow anon role to access all tables since this app uses PIN-based auth, not Supabase Auth

-- produtos
CREATE POLICY "Anon can select produtos" ON public.produtos FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert produtos" ON public.produtos FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update produtos" ON public.produtos FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can delete produtos" ON public.produtos FOR DELETE TO anon USING (true);

-- movimentacoes
CREATE POLICY "Anon can select movimentacoes" ON public.movimentacoes FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert movimentacoes" ON public.movimentacoes FOR INSERT TO anon WITH CHECK (true);

-- buffet_items
CREATE POLICY "Anon can select buffet_items" ON public.buffet_items FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can manage buffet_items" ON public.buffet_items FOR ALL TO anon USING (true) WITH CHECK (true);

-- ementa_diaria
CREATE POLICY "Anon can select ementa_diaria" ON public.ementa_diaria FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can manage ementa_diaria" ON public.ementa_diaria FOR ALL TO anon USING (true) WITH CHECK (true);

-- fichas_tecnicas
CREATE POLICY "Anon can select fichas_tecnicas" ON public.fichas_tecnicas FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can manage fichas_tecnicas" ON public.fichas_tecnicas FOR ALL TO anon USING (true) WITH CHECK (true);

-- ficha_ingredientes
CREATE POLICY "Anon can select ficha_ingredientes" ON public.ficha_ingredientes FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can manage ficha_ingredientes" ON public.ficha_ingredientes FOR ALL TO anon USING (true) WITH CHECK (true);

-- fornecedores
CREATE POLICY "Anon can select fornecedores" ON public.fornecedores FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert fornecedores" ON public.fornecedores FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update fornecedores" ON public.fornecedores FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can delete fornecedores" ON public.fornecedores FOR DELETE TO anon USING (true);
