
CREATE TABLE public.mesas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  number integer NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'livre',
  adults integer NOT NULL DEFAULT 0,
  children2to6 integer NOT NULL DEFAULT 0,
  children7to12 integer NOT NULL DEFAULT 0,
  waiter text NOT NULL DEFAULT '',
  opened_at timestamp with time zone,
  beverages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mesas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view mesas" ON public.mesas FOR SELECT USING (true);
CREATE POLICY "Anyone can insert mesas" ON public.mesas FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update mesas" ON public.mesas FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete mesas" ON public.mesas FOR DELETE USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.mesas;

-- Seed 20 tables
INSERT INTO public.mesas (number, status) VALUES
  (1,'livre'),(2,'livre'),(3,'livre'),(4,'livre'),(5,'livre'),
  (6,'livre'),(7,'livre'),(8,'livre'),(9,'livre'),(10,'livre'),
  (11,'livre'),(12,'livre'),(13,'livre'),(14,'livre'),(15,'livre'),
  (16,'livre'),(17,'livre'),(18,'livre'),(19,'livre'),(20,'livre');
