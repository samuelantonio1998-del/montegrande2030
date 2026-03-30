-- Add foto_url to fichas_tecnicas
ALTER TABLE public.fichas_tecnicas ADD COLUMN IF NOT EXISTS foto_url text;

-- Create storage bucket for dish photos
INSERT INTO storage.buckets (id, name, public) VALUES ('pratos', 'pratos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to pratos bucket
CREATE POLICY "Authenticated users can upload to pratos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'pratos');

-- Allow public read access
CREATE POLICY "Public can view pratos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'pratos');

-- Allow authenticated users to update/delete their uploads
CREATE POLICY "Authenticated users can update pratos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'pratos');

CREATE POLICY "Authenticated users can delete pratos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'pratos');