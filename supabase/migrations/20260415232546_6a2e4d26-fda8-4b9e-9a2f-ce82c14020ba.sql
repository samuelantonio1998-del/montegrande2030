
CREATE POLICY "Anyone can upload to pratos"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'pratos');

CREATE POLICY "Anyone can update pratos"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'pratos');
