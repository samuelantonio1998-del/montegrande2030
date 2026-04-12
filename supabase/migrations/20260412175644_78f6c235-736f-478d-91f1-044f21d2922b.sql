-- Add departamento column to tarefas
ALTER TABLE public.tarefas
ADD COLUMN departamento text NOT NULL DEFAULT 'todos';
