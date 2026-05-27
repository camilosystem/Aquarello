-- Columnas faltantes en orders requeridas por la aplicación
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS estimated_price  INTEGER,
  ADD COLUMN IF NOT EXISTS final_price      INTEGER,
  ADD COLUMN IF NOT EXISTS reception_code   TEXT,
  ADD COLUMN IF NOT EXISTS user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS base_price       INTEGER;
