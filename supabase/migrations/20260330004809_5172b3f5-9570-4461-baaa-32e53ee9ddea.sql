
-- Allow anon to delete ficha_ingredientes (needed for edit/re-insert flow)
CREATE POLICY "Anon can delete ficha_ingredientes" ON public.ficha_ingredientes FOR DELETE TO anon USING (true);

-- Allow authenticated to delete ficha_ingredientes
CREATE POLICY "Authenticated can delete ficha_ingredientes" ON public.ficha_ingredientes FOR DELETE TO authenticated USING (true);
