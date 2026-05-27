-- Asegura que todas las columnas requeridas por la app existan en orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS user_id              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS operator_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS driver_id            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivery_person_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS walk_in_name         TEXT,
  ADD COLUMN IF NOT EXISTS walk_in_phone        TEXT,
  ADD COLUMN IF NOT EXISTS reception_code       TEXT,
  ADD COLUMN IF NOT EXISTS weight_kg            DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS actual_weight        DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS total_price          INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_price      INTEGER,
  ADD COLUMN IF NOT EXISTS final_price          INTEGER,
  ADD COLUMN IF NOT EXISTS base_price           INTEGER,
  ADD COLUMN IF NOT EXISTS pickup_lat           DECIMAL(10,8),
  ADD COLUMN IF NOT EXISTS pickup_lng           DECIMAL(11,8),
  ADD COLUMN IF NOT EXISTS delivery_address     TEXT,
  ADD COLUMN IF NOT EXISTS delivery_lat         DECIMAL(10,8),
  ADD COLUMN IF NOT EXISTS delivery_lng         DECIMAL(11,8),
  ADD COLUMN IF NOT EXISTS notes                TEXT,
  ADD COLUMN IF NOT EXISTS updated_at           TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS payment_status       TEXT DEFAULT 'pendiente'
    CHECK (payment_status IN ('pendiente','pagado','reembolsado'));
