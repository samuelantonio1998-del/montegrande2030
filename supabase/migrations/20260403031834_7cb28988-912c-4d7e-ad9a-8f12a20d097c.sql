CREATE POLICY "Anyone can delete registos_producao"
ON public.registos_producao
FOR DELETE
TO public
USING (true);