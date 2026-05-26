-- Nuevas columnas en order_preferences para separación de colores y contador de manchas
ALTER TABLE public.order_preferences
  ADD COLUMN IF NOT EXISTS separate_colors BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stain_count     INTEGER  NOT NULL DEFAULT 0;
