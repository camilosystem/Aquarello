CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  -- Tarifas base
  price_per_kg       INTEGER NOT NULL DEFAULT 8000,
  min_price          INTEGER NOT NULL DEFAULT 25000,
  -- Servicios adicionales
  price_ironing      INTEGER NOT NULL DEFAULT 5000,
  price_softener     INTEGER NOT NULL DEFAULT 2000,
  price_bleach       INTEGER NOT NULL DEFAULT 1500,
  price_degreaser    INTEGER NOT NULL DEFAULT 2500,
  price_stain_treatment INTEGER NOT NULL DEFAULT 4000,
  price_delicate_care   INTEGER NOT NULL DEFAULT 2000,
  price_special_folding INTEGER NOT NULL DEFAULT 1000,
  price_express         INTEGER NOT NULL DEFAULT 10000,
  -- Horarios de operación
  opening_time       TEXT NOT NULL DEFAULT '07:00',
  closing_time       TEXT NOT NULL DEFAULT '20:00',
  avg_wash_minutes   INTEGER NOT NULL DEFAULT 120,
  -- Notificaciones
  notif_new_order    BOOLEAN NOT NULL DEFAULT true,
  notif_low_stock    BOOLEAN NOT NULL DEFAULT true,
  notif_order_ready  BOOLEAN NOT NULL DEFAULT true,
  -- Meta
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "operador_settings" ON public.app_settings FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('operador','admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('operador','admin')));

-- Fila única con valores por defecto
INSERT INTO public.app_settings (id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;
