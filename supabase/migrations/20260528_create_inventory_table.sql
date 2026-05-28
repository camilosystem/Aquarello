CREATE TABLE IF NOT EXISTS public.inventory (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  category         TEXT NOT NULL DEFAULT '',
  unit             TEXT NOT NULL DEFAULT 'unidad',
  quantity         INTEGER NOT NULL DEFAULT 0,
  min_stock        INTEGER NOT NULL DEFAULT 0,
  max_stock        INTEGER NOT NULL DEFAULT 0,
  cost_per_box     NUMERIC(12,2) NOT NULL DEFAULT 0,
  units_per_box    INTEGER NOT NULL DEFAULT 1,
  cost_per_unit    NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- Operadores y admins pueden hacer todo
CREATE POLICY "operadores pueden gestionar inventario"
  ON public.inventory
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('operador', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('operador', 'admin')
    )
  );

-- Invalidar caché de PostgREST
NOTIFY pgrst, 'reload schema';
