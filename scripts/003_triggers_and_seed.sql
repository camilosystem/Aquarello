-- LaundryGO - Triggers y Datos Iniciales

-- Trigger para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'phone', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'cliente')
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_washing_process_updated_at
  BEFORE UPDATE ON public.washing_process
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_inventory_updated_at
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Función para generar códigos QR únicos
CREATE OR REPLACE FUNCTION public.generate_qr_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_code TEXT;
BEGIN
  new_code := 'LG-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 8));
  RETURN new_code;
END;
$$;

-- Función para generar números de recibo
CREATE OR REPLACE FUNCTION public.generate_receipt_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_number TEXT;
  counter INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO counter FROM public.receipts 
  WHERE DATE(created_at) = CURRENT_DATE;
  
  new_number := 'REC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
  RETURN new_number;
END;
$$;

-- Datos iniciales de precios
INSERT INTO public.pricing (name, price_per_kg, description, is_active) VALUES
  ('Lavado Estándar', 8000, 'Lavado, secado y doblado básico', TRUE),
  ('Lavado Premium', 12000, 'Lavado con suavizante premium, secado y doblado', TRUE),
  ('Lavado + Planchado', 15000, 'Lavado, secado, planchado y doblado', TRUE),
  ('Solo Planchado', 5000, 'Servicio de planchado por kg', TRUE),
  ('Tratamiento de Manchas', 3000, 'Tratamiento especial para manchas difíciles (adicional)', TRUE),
  ('Ropa Delicada', 18000, 'Lavado especial para ropa delicada', TRUE)
ON CONFLICT DO NOTHING;

-- Datos iniciales de inventario
INSERT INTO public.inventory (name, category, current_stock, unit, min_stock, cost_per_unit) VALUES
  ('Detergente Líquido Premium', 'detergente', 5000, 'ml', 500, 50),
  ('Suavizante Floral', 'suavizante', 3000, 'ml', 500, 40),
  ('Suavizante Lavanda', 'suavizante', 3000, 'ml', 500, 40),
  ('Blanqueador', 'blanqueador', 2000, 'ml', 300, 35),
  ('Desengrasante Industrial', 'desengrasante', 1500, 'ml', 300, 60),
  ('Fragancia Fresca', 'fragancia', 1000, 'ml', 200, 80),
  ('Fragancia Lavanda', 'fragancia', 1000, 'ml', 200, 80),
  ('Fragancia Floral', 'fragancia', 1000, 'ml', 200, 80),
  ('Quitamanchas Especial', 'otros', 500, 'ml', 100, 100)
ON CONFLICT DO NOTHING;
