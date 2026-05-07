-- Ampliar métodos de pago aceptados
ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_payment_method_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_payment_method_check
  CHECK (payment_method IN ('efectivo', 'nequi', 'brevo', 'payu', 'tarjeta', 'transferencia', 'daviplata'));

-- Agregar notas al pago (referencia de transferencia, observación, etc.)
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Estado de pago en la orden (para consulta rápida sin JOIN a payments)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pendiente'
  CHECK (payment_status IN ('pendiente', 'pagado', 'reembolsado'));
