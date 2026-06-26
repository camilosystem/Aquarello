CREATE TABLE IF NOT EXISTS public.payments (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID        NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount          INTEGER     NOT NULL,
  payment_method  TEXT        NOT NULL CHECK (payment_method IN ('efectivo','nequi','brevo','payu','tarjeta','transferencia','daviplata')),
  status          TEXT        NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','completado','fallido','reembolsado')),
  paid_at         TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "operador_payments" ON public.payments;
CREATE POLICY "operador_payments" ON public.payments FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('operador','admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('operador','admin'))
  );
