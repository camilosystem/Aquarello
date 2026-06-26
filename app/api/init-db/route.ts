import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Create tables using raw SQL via the REST API
    const createTablesSQL = `
      -- Profiles table (extends auth.users)
      CREATE TABLE IF NOT EXISTS public.profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        email TEXT,
        full_name TEXT,
        phone TEXT,
        address TEXT,
        city TEXT DEFAULT 'New York',
        role TEXT NOT NULL DEFAULT 'cliente' CHECK (role IN ('cliente', 'domiciliario', 'operador', 'conductor', 'admin')),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Orders table
      CREATE TABLE IF NOT EXISTS public.orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        qr_code TEXT UNIQUE NOT NULL,
        client_id UUID NOT NULL REFERENCES public.profiles(id),
        delivery_person_id UUID REFERENCES public.profiles(id),
        operator_id UUID REFERENCES public.profiles(id),
        driver_id UUID REFERENCES public.profiles(id),
        status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN (
          'pendiente', 'recogido', 'en_deposito', 'en_transito_lavado', 
          'en_lavado', 'en_secado', 'en_alistamiento', 'listo',
          'en_transito_entrega', 'en_ruta_entrega', 'entregado', 'cancelado'
        )),
        weight_kg DECIMAL(5,2),
        pickup_address TEXT NOT NULL,
        pickup_lat DECIMAL(10,8),
        pickup_lng DECIMAL(11,8),
        delivery_address TEXT,
        delivery_lat DECIMAL(10,8),
        delivery_lng DECIMAL(11,8),
        estimated_price INTEGER,
        final_price INTEGER,
        pickup_date TIMESTAMPTZ,
        estimated_delivery TIMESTAMPTZ,
        actual_delivery TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Order preferences table
      CREATE TABLE IF NOT EXISTS public.order_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
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
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Order history table
      CREATE TABLE IF NOT EXISTS public.order_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
        status TEXT NOT NULL,
        notes TEXT,
        changed_by UUID REFERENCES public.profiles(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Washing process table
      CREATE TABLE IF NOT EXISTS public.washing_process (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
        operator_id UUID REFERENCES public.profiles(id),
        washing_machine TEXT,
        dryer TEXT,
        status TEXT NOT NULL DEFAULT 'recibido' CHECK (status IN (
          'recibido', 'en_alistamiento', 'en_lavado', 'en_suavizado',
          'en_secado', 'en_planchado', 'en_doblado', 'completado'
        )),
        started_at TIMESTAMPTZ,
        washing_started TIMESTAMPTZ,
        washing_ended TIMESTAMPTZ,
        drying_started TIMESTAMPTZ,
        drying_ended TIMESTAMPTZ,
        ironing_started TIMESTAMPTZ,
        ironing_ended TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Inventory table
      CREATE TABLE IF NOT EXISTS public.inventory (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
        unit TEXT NOT NULL,
        min_stock DECIMAL(10,2) DEFAULT 10,
        cost_per_unit INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Inventory usage table
      CREATE TABLE IF NOT EXISTS public.inventory_usage (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        inventory_id UUID NOT NULL REFERENCES public.inventory(id),
        order_id UUID REFERENCES public.orders(id),
        quantity_used DECIMAL(10,2) NOT NULL,
        used_by UUID REFERENCES public.profiles(id),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Payments table
      CREATE TABLE IF NOT EXISTS public.payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL,
        payment_method TEXT NOT NULL CHECK (payment_method IN ('tarjeta', 'nequi', 'efectivo')),
        status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'completado', 'fallido', 'reembolsado')),
        transaction_id TEXT,
        paid_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Receipts table
      CREATE TABLE IF NOT EXISTS public.receipts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
        receipt_number TEXT UNIQUE NOT NULL,
        subtotal INTEGER NOT NULL,
        tax INTEGER NOT NULL DEFAULT 0,
        total INTEGER NOT NULL,
        pdf_url TEXT,
        sent_to_client BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Pricing table
      CREATE TABLE IF NOT EXISTS public.pricing (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        price_per_kg INTEGER NOT NULL,
        additional_services JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Enable RLS on all tables
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
    `;

    // Try to check if tables exist by querying profiles
    const { error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (checkError && checkError.code === '42P01') {
      // Tables don't exist - this is expected for new setup
      return NextResponse.json({ 
        success: false, 
        message: 'The tables do not exist yet. Please run the SQL script manually in Supabase.',
        sql: createTablesSQL
      });
    }

    // Insert default pricing if empty
    const { data: pricingData } = await supabase
      .from('pricing')
      .select('id')
      .limit(1);

    if (!pricingData || pricingData.length === 0) {
      await supabase.from('pricing').insert([
        {
          name: 'Standard Wash',
          description: 'Basic wash, dry, and fold',
          price_per_kg: 1.75,
          additional_services: {
            planchado: 3,
            suavizante_premium: 1.50,
            blanqueador: 1.25,
            desengrasante: 2,
            tratamiento_manchas: 3
          },
          is_active: true
        },
        {
          name: 'Premium Wash',
          description: 'Premium wash with special care',
          price_per_kg: 2.50,
          additional_services: {
            planchado: 3,
            suavizante_premium: 1.50,
            blanqueador: 1.25,
            desengrasante: 2,
            tratamiento_manchas: 3
          },
          is_active: true
        }
      ]);
    }

    // Insert default inventory if empty
    const { data: inventoryData } = await supabase
      .from('inventory')
      .select('id')
      .limit(1);

    if (!inventoryData || inventoryData.length === 0) {
      await supabase.from('inventory').insert([
        { name: 'Liquid Detergent', category: 'detergentes', quantity: 50, unit: 'liters', min_stock: 10, cost_per_unit: 4 },
        { name: 'Fabric Softener', category: 'suavizantes', quantity: 40, unit: 'liters', min_stock: 8, cost_per_unit: 5 },
        { name: 'Bleach', category: 'blanqueadores', quantity: 30, unit: 'liters', min_stock: 5, cost_per_unit: 2 },
        { name: 'Degreaser', category: 'desengrasantes', quantity: 20, unit: 'liters', min_stock: 5, cost_per_unit: 6 },
        { name: 'Stain Remover', category: 'tratamientos', quantity: 15, unit: 'liters', min_stock: 3, cost_per_unit: 9 },
        { name: 'Lavender Fragrance', category: 'fragancias', quantity: 10, unit: 'liters', min_stock: 2, cost_per_unit: 14 },
        { name: 'Floral Fragrance', category: 'fragancias', quantity: 10, unit: 'liters', min_stock: 2, cost_per_unit: 14 },
      ]);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Database verified successfully'
    });

  } catch (error) {
    console.error('Error initializing database:', error);
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 });
  }
}
