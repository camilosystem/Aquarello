import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('Starting LaundryGO database migration...');

  // Create profiles table
  const { error: profilesError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS public.profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        email TEXT,
        full_name TEXT,
        phone TEXT,
        address TEXT,
        city TEXT DEFAULT 'Bogotá',
        role TEXT NOT NULL DEFAULT 'cliente' CHECK (role IN ('cliente', 'domiciliario', 'operador', 'conductor', 'admin')),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  });

  if (profilesError) {
    console.log('Note: profiles table may already exist or needs manual creation');
  }

  // Test connection by selecting from a simple query
  const { data, error } = await supabase.from('profiles').select('count').limit(1);
  
  if (error && error.code === '42P01') {
    console.log('Tables do not exist yet. Please run the SQL migration manually in Supabase dashboard.');
    console.log('SQL files are located in /scripts/ folder');
  } else if (error) {
    console.log('Connection test:', error.message);
  } else {
    console.log('Database connection successful!');
  }
}

runMigration().catch(console.error);
