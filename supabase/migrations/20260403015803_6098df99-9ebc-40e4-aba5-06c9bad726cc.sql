
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name text NOT NULL DEFAULT '',
  user_role text NOT NULL DEFAULT '',
  action text NOT NULL,
  module text NOT NULL DEFAULT '',
  details text DEFAULT '',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view activity_logs" ON public.activity_logs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert activity_logs" ON public.activity_logs FOR INSERT WITH CHECK (true);

CREATE INDEX idx_activity_logs_created ON public.activity_logs (created_at DESC);
CREATE INDEX idx_activity_logs_module ON public.activity_logs (module);
