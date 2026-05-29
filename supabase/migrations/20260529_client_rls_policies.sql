-- Políticas RLS para que clientes puedan crear y ver sus propias órdenes

-- ── orders ────────────────────────────────────────────────────────────────
-- SELECT: el cliente ve solo sus propias órdenes
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='orders' AND policyname='cliente_select_own_orders'
  ) THEN
    CREATE POLICY "cliente_select_own_orders" ON public.orders
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- INSERT: el cliente solo puede crear órdenes para sí mismo
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='orders' AND policyname='cliente_insert_own_orders'
  ) THEN
    CREATE POLICY "cliente_insert_own_orders" ON public.orders
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- UPDATE: el cliente puede actualizar sus propias órdenes (ej: teléfono, dirección)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='orders' AND policyname='cliente_update_own_orders'
  ) THEN
    CREATE POLICY "cliente_update_own_orders" ON public.orders
      FOR UPDATE TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- ── order_preferences ─────────────────────────────────────────────────────
-- SELECT
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='order_preferences' AND policyname='cliente_select_own_preferences'
  ) THEN
    CREATE POLICY "cliente_select_own_preferences" ON public.order_preferences
      FOR SELECT TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND user_id = auth.uid())
      );
  END IF;
END $$;

-- INSERT
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='order_preferences' AND policyname='cliente_insert_own_preferences'
  ) THEN
    CREATE POLICY "cliente_insert_own_preferences" ON public.order_preferences
      FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND user_id = auth.uid())
      );
  END IF;
END $$;

-- ── order_history ─────────────────────────────────────────────────────────
-- SELECT
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='order_history' AND policyname='cliente_select_own_history'
  ) THEN
    CREATE POLICY "cliente_select_own_history" ON public.order_history
      FOR SELECT TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND user_id = auth.uid())
      );
  END IF;
END $$;

-- INSERT
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='order_history' AND policyname='cliente_insert_own_history'
  ) THEN
    CREATE POLICY "cliente_insert_own_history" ON public.order_history
      FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND user_id = auth.uid())
      );
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
