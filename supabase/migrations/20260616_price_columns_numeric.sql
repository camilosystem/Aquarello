ALTER TABLE public.app_settings
  ALTER COLUMN price_per_kg        TYPE NUMERIC(10,2),
  ALTER COLUMN min_price           TYPE NUMERIC(10,2),
  ALTER COLUMN price_ironing       TYPE NUMERIC(10,2),
  ALTER COLUMN price_softener      TYPE NUMERIC(10,2),
  ALTER COLUMN price_bleach        TYPE NUMERIC(10,2),
  ALTER COLUMN price_degreaser     TYPE NUMERIC(10,2),
  ALTER COLUMN price_stain_treatment  TYPE NUMERIC(10,2),
  ALTER COLUMN price_delicate_care    TYPE NUMERIC(10,2),
  ALTER COLUMN price_special_folding  TYPE NUMERIC(10,2),
  ALTER COLUMN price_express          TYPE NUMERIC(10,2),
  ALTER COLUMN price_separate_whites  TYPE NUMERIC(10,2),
  ALTER COLUMN price_separate_colors  TYPE NUMERIC(10,2);
