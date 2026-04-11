
CREATE TABLE public.funcionarios (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  role text NOT NULL DEFAULT 'sala',
  pin text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view funcionarios" ON public.funcionarios FOR SELECT USING (true);
CREATE POLICY "Anyone can insert funcionarios" ON public.funcionarios FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update funcionarios" ON public.funcionarios FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete funcionarios" ON public.funcionarios FOR DELETE USING (true);

CREATE TRIGGER update_funcionarios_updated_at
  BEFORE UPDATE ON public.funcionarios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default employees
INSERT INTO public.funcionarios (nome, role, pin) VALUES
  ('João', 'sala', '1111'),
  ('Maria', 'sala', '2222'),
  ('Pedro', 'cozinha', '3333'),
  ('Ana', 'cozinha', '4444'),
  ('Carlos', 'gerencia', '5555');
