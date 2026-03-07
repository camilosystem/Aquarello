-- LaundryGO - Sistema de Gestión de Lavandería Colombia
-- Migración inicial: Creación de tablas principales

-- Tabla de perfiles de usuario (extiende auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  address TEXT,
  city TEXT DEFAULT 'Bogotá',
  neighborhood TEXT,
  role TEXT NOT NULL DEFAULT 'cliente' CHECK (role IN ('cliente', 'domiciliario', 'operador', 'conductor', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de pedidos principales
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  domiciliario_pickup_id UUID REFERENCES public.profiles(id),
  domiciliario_delivery_id UUID REFERENCES public.profiles(id),
  operator_id UUID REFERENCES public.profiles(id),
  driver_id UUID REFERENCES public.profiles(id),
  qr_code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN (
    'pendiente', 'recogido', 'en_bodega', 'en_transito_lavado', 
    'en_lavado', 'en_secado', 'en_planchado', 'en_doblado', 
    'en_alistamiento', 'en_transito_entrega', 'en_ruta_entrega', 
    'entregado', 'cancelado'
  )),
  weight_kg DECIMAL(5,2),
  total_price INTEGER DEFAULT 0,
  pickup_address TEXT NOT NULL,
  pickup_lat DECIMAL(10,8),
  pickup_lng DECIMAL(11,8),
  delivery_address TEXT,
  delivery_lat DECIMAL(10,8),
  delivery_lng DECIMAL(11,8),
  pickup_notes TEXT,
  delivery_notes TEXT,
  scheduled_pickup TIMESTAMPTZ,
  actual_pickup TIMESTAMPTZ,
  scheduled_delivery TIMESTAMPTZ,
  actual_delivery TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de preferencias de lavado por pedido
CREATE TABLE IF NOT EXISTS public.order_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  separate_whites BOOLEAN DEFAULT FALSE,
  use_softener BOOLEAN DEFAULT FALSE,
  use_degreaser BOOLEAN DEFAULT FALSE,
  use_bleach BOOLEAN DEFAULT FALSE,
  fragrance TEXT DEFAULT 'normal' CHECK (fragrance IN ('normal', 'lavanda', 'floral', 'fresco', 'sin_olor')),
  ironing_required BOOLEAN DEFAULT FALSE,
  special_folding BOOLEAN DEFAULT FALSE,
  delicate_items BOOLEAN DEFAULT FALSE,
  stain_treatment BOOLEAN DEFAULT FALSE,
  extra_rinse BOOLEAN DEFAULT FALSE,
  special_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de historial de estados del pedido
CREATE TABLE IF NOT EXISTS public.order_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  changed_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  location_lat DECIMAL(10,8),
  location_lng DECIMAL(11,8),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de proceso de lavado (detalle del operador)
CREATE TABLE IF NOT EXISTS public.washing_process (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES public.profiles(id),
  washing_machine TEXT,
  dryer_machine TEXT,
  wash_start TIMESTAMPTZ,
  wash_end TIMESTAMPTZ,
  dry_start TIMESTAMPTZ,
  dry_end TIMESTAMPTZ,
  iron_start TIMESTAMPTZ,
  iron_end TIMESTAMPTZ,
  fold_start TIMESTAMPTZ,
  fold_end TIMESTAMPTZ,
  quality_check BOOLEAN DEFAULT FALSE,
  quality_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de inventario de insumos
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('detergente', 'suavizante', 'blanqueador', 'desengrasante', 'fragancia', 'otros')),
  current_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'ml' CHECK (unit IN ('ml', 'gr', 'unidad')),
  min_stock DECIMAL(10,2) NOT NULL DEFAULT 100,
  cost_per_unit INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de uso de insumos por pedido
CREATE TABLE IF NOT EXISTS public.inventory_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES public.inventory(id),
  quantity_used DECIMAL(10,2) NOT NULL,
  used_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de pagos
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('tarjeta', 'nequi', 'efectivo', 'transferencia')),
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'procesando', 'completado', 'fallido', 'reembolsado')),
  transaction_id TEXT,
  nequi_phone TEXT,
  card_last_four TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de recibos
CREATE TABLE IF NOT EXISTS public.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  receipt_number TEXT UNIQUE NOT NULL,
  subtotal INTEGER NOT NULL,
  tax INTEGER DEFAULT 0,
  total INTEGER NOT NULL,
  pdf_url TEXT,
  sent_to_customer BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de precios por servicio
CREATE TABLE IF NOT EXISTS public.pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price_per_kg INTEGER NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_qr ON public.orders(qr_code);
CREATE INDEX IF NOT EXISTS idx_order_history_order ON public.order_history(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Habilitar Row Level Security en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.washing_process ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing ENABLE ROW LEVEL SECURITY;
