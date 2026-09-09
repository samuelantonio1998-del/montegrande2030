ALTER TABLE public.produtos ALTER COLUMN stock_minimo DROP NOT NULL;
ALTER TABLE public.produtos ALTER COLUMN stock_maximo DROP NOT NULL;
ALTER TABLE public.produtos ALTER COLUMN stock_minimo DROP DEFAULT;
ALTER TABLE public.produtos ALTER COLUMN stock_maximo DROP DEFAULT;