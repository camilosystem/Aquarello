-- Agregar columnas faltantes en washing_process
ALTER TABLE public.washing_process
  ADD COLUMN IF NOT EXISTS washing_machine_id TEXT,
  ADD COLUMN IF NOT EXISTS dryer_id           TEXT,
  ADD COLUMN IF NOT EXISTS alistamiento_completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lavado_completed        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS secado_completed        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS planchado_completed     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS doblado_completed       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
