-- Add canal column to registos_producao
ALTER TABLE public.registos_producao
ADD COLUMN canal text NOT NULL DEFAULT 'buffet';

-- Create take away pricing table
CREATE TABLE public.precario_takeaway (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  categoria text NOT NULL DEFAULT 'prato',
  preco numeric NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.precario_takeaway ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view precario_takeaway" ON public.precario_takeaway FOR SELECT USING (true);
CREATE POLICY "Anyone can insert precario_takeaway" ON public.precario_takeaway FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update precario_takeaway" ON public.precario_takeaway FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete precario_takeaway" ON public.precario_takeaway FOR DELETE USING (true);

CREATE TRIGGER update_precario_takeaway_updated_at
BEFORE UPDATE ON public.precario_takeaway
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();