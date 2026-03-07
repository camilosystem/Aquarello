-- LaundryGO Database Setup
-- Run this script to create all necessary tables

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  address TEXT,
  role TEXT DEFAULT 'cliente' CHECK (role IN ('cliente', 'domiciliario', 'operador', 'conductor', 'admin')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code TEXT UNIQUE NOT NULL,
  client_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  courier_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  operator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pendiente' CHECK (status IN (
    'pendiente', 'recogido', 'en_deposito', 'en_transito_lavado',
    'en_lavado', 'en_secado', 'en_planchado', 'en_doblado',
    'listo', 'en_transito_entrega', 'en_entrega', 'entregado', 'cancelado'
  )),
  pickup_address TEXT NOT NULL,
  delivery_address TEXT,
  weight_kg DECIMAL(10,2),
  estimated_price INTEGER,
  final_price INTEGER,
  pickup_date TIMESTAMPTZ,
  delivery_date TIMESTAMPTZ,
  washer_id TEXT,
  dryer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Order preferences table
CREATE TABLE IF NOT EXISTS public.order_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  separate_whites BOOLEAN DEFAULT false,
  use_softener BOOLEAN DEFAULT true,
  use_degreaser BOOLEAN DEFAULT false,
  use_bleach BOOLEAN DEFAULT false,
  fragrance TEXT DEFAULT 'suave',
  ironing_required BOOLEAN DEFAULT false,
  special_folding BOOLEAN DEFAULT false,
  delicate_care BOOLEAN DEFAULT false,
  stain_treatment BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Order history table
CREATE TABLE IF NOT EXISTS public.order_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  notes TEXT,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Inventory table
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT CHECK (category IN ('detergente', 'suavizante', 'blanqueador', 'desengrasante', 'quitamanchas', 'fragancia', 'otro')),
  unit TEXT DEFAULT 'litros',
  current_stock DECIMAL(10,2) DEFAULT 0,
  min_stock DECIMAL(10,2) DEFAULT 10,
  price_per_unit INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  method TEXT CHECK (method IN ('tarjeta', 'nequi', 'efectivo', 'transferencia')),
  status TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'procesando', 'completado', 'fallido', 'reembolsado')),
  reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Orders policies (clients can see their orders, staff can see all)
CREATE POLICY "Clients can view own orders" ON public.orders FOR SELECT USING (
  auth.uid() = client_id OR 
  auth.uid() = courier_id OR 
  auth.uid() = operator_id OR
  auth.uid() = driver_id OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('operador', 'admin', 'domiciliario', 'conductor'))
);
CREATE POLICY "Clients can insert orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Staff can update orders" ON public.orders FOR UPDATE USING (
  auth.uid() = client_id OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('operador', 'admin', 'domiciliario', 'conductor'))
);

-- Order preferences policies
CREATE POLICY "View order preferences" ON public.order_preferences FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND (
    client_id = auth.uid() OR courier_id = auth.uid() OR operator_id = auth.uid()
  )) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('operador', 'admin'))
);
CREATE POLICY "Insert order preferences" ON public.order_preferences FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND client_id = auth.uid())
);

-- Order history policies
CREATE POLICY "View order history" ON public.order_history FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND (
    client_id = auth.uid() OR courier_id = auth.uid() OR operator_id = auth.uid()
  )) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('operador', 'admin', 'domiciliario', 'conductor'))
);
CREATE POLICY "Insert order history" ON public.order_history FOR INSERT WITH CHECK (auth.uid() = changed_by);

-- Inventory policies (only operators and admin)
CREATE POLICY "Staff can view inventory" ON public.inventory FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('operador', 'admin'))
);
CREATE POLICY "Staff can manage inventory" ON public.inventory FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('operador', 'admin'))
);

-- Payments policies
CREATE POLICY "View own payments" ON public.payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND client_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('operador', 'admin'))
);
CREATE POLICY "Insert payments" ON public.payments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND client_id = auth.uid())
);

-- Auto-create profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
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
