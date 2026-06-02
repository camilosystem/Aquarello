-- Secuencia para número de orden de 6 dígitos
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq
  START WITH 1
  INCREMENT BY 1
  NO MAXVALUE;

-- Columna order_number auto-asignada al insertar
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_number INTEGER UNIQUE DEFAULT nextval('public.order_number_seq');

-- Asignar números a órdenes existentes que quedaron sin él
UPDATE public.orders
  SET order_number = nextval('public.order_number_seq')
  WHERE order_number IS NULL;

NOTIFY pgrst, 'reload schema';
