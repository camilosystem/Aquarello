-- Permite crear órdenes sin cliente registrado (walk-in / creadas por operador)
ALTER TABLE public.orders
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS walk_in_name  TEXT,
  ADD COLUMN IF NOT EXISTS walk_in_phone TEXT;
