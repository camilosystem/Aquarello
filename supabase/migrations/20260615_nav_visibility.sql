ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS nav_visibility JSONB NOT NULL DEFAULT '{
    "dashboard":true,
    "tickets":true,
    "machines":true,
    "inventory":true,
    "purchases":true,
    "customers":true,
    "drivers":true,
    "team":true,
    "reports":true
  }'::jsonb;
