-- VETRONIX Supabase + Supabase Auth setup
-- Run this SQL once in the Supabase SQL Editor AFTER enabling
-- Authentication -> Providers -> Email.
--
-- This keeps the existing VETRONIX tables and website design intact.
-- It replaces the old open/anon policies with authenticated, farmer-scoped RLS.

ALTER TABLE public.farmers
  ADD COLUMN IF NOT EXISTS name text;

ALTER TABLE public.farmers
  ADD COLUMN IF NOT EXISTS auth_user_id uuid;

ALTER TABLE public.cattle
  ADD COLUMN IF NOT EXISTS animal_type text;

ALTER TABLE public.cattle
  ADD COLUMN IF NOT EXISTS medical_history text;

CREATE UNIQUE INDEX IF NOT EXISTS farmers_auth_user_id_unique
  ON public.farmers (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

ALTER TABLE public.farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cattle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_predictions ENABLE ROW LEVEL SECURITY;

-- Only authenticated Supabase users may use the VETRONIX data API.
REVOKE ALL ON TABLE public.farmers FROM anon;
REVOKE ALL ON TABLE public.cattle FROM anon;
REVOKE ALL ON TABLE public.sensor_readings FROM anon;
REVOKE ALL ON TABLE public.predictions FROM anon;
REVOKE ALL ON TABLE public.image_predictions FROM anon;

GRANT SELECT, INSERT, UPDATE ON TABLE public.farmers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.cattle TO authenticated;
GRANT SELECT, INSERT ON TABLE public.sensor_readings TO authenticated;
GRANT SELECT, INSERT ON TABLE public.predictions TO authenticated;
GRANT SELECT, INSERT ON TABLE public.image_predictions TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================
-- FARMERS
-- ============================================================
DROP POLICY IF EXISTS vetronix_farmers_select ON public.farmers;
DROP POLICY IF EXISTS vetronix_farmers_insert ON public.farmers;
DROP POLICY IF EXISTS vetronix_farmers_update ON public.farmers;

CREATE POLICY vetronix_farmers_select
ON public.farmers
FOR SELECT
TO authenticated
USING (
  auth_user_id = (select auth.uid())
  OR lower(coalesce(email, '')) = lower(coalesce((select auth.jwt()->>'email'), ''))
);

CREATE POLICY vetronix_farmers_insert
ON public.farmers
FOR INSERT
TO authenticated
WITH CHECK (
  auth_user_id = (select auth.uid())
);

CREATE POLICY vetronix_farmers_update
ON public.farmers
FOR UPDATE
TO authenticated
USING (
  auth_user_id = (select auth.uid())
  OR lower(coalesce(email, '')) = lower(coalesce((select auth.jwt()->>'email'), ''))
)
WITH CHECK (
  auth_user_id = (select auth.uid())
);

-- ============================================================
-- CATTLE
-- ============================================================
DROP POLICY IF EXISTS vetronix_cattle_select ON public.cattle;
DROP POLICY IF EXISTS vetronix_cattle_insert ON public.cattle;
DROP POLICY IF EXISTS vetronix_cattle_update ON public.cattle;

CREATE POLICY vetronix_cattle_select
ON public.cattle
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.farmers f
    WHERE f.id = cattle.farmer_id
      AND f.auth_user_id = (select auth.uid())
  )
);

CREATE POLICY vetronix_cattle_insert
ON public.cattle
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.farmers f
    WHERE f.id = cattle.farmer_id
      AND f.auth_user_id = (select auth.uid())
  )
);

CREATE POLICY vetronix_cattle_update
ON public.cattle
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.farmers f
    WHERE f.id = cattle.farmer_id
      AND f.auth_user_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.farmers f
    WHERE f.id = cattle.farmer_id
      AND f.auth_user_id = (select auth.uid())
  )
);

-- ============================================================
-- SENSOR READINGS
-- ============================================================
DROP POLICY IF EXISTS vetronix_sensor_select ON public.sensor_readings;
DROP POLICY IF EXISTS vetronix_sensor_insert ON public.sensor_readings;

CREATE POLICY vetronix_sensor_select
ON public.sensor_readings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.cattle c
    JOIN public.farmers f ON f.id = c.farmer_id
    WHERE c.id = sensor_readings.cattle_id
      AND f.auth_user_id = (select auth.uid())
  )
);

CREATE POLICY vetronix_sensor_insert
ON public.sensor_readings
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.cattle c
    JOIN public.farmers f ON f.id = c.farmer_id
    WHERE c.id = sensor_readings.cattle_id
      AND f.auth_user_id = (select auth.uid())
  )
);

-- ============================================================
-- PREDICTIONS
-- ============================================================
DROP POLICY IF EXISTS vetronix_prediction_select ON public.predictions;
DROP POLICY IF EXISTS vetronix_prediction_insert ON public.predictions;

CREATE POLICY vetronix_prediction_select
ON public.predictions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.cattle c
    JOIN public.farmers f ON f.id = c.farmer_id
    WHERE c.id = predictions.cattle_id
      AND f.auth_user_id = (select auth.uid())
  )
);

CREATE POLICY vetronix_prediction_insert
ON public.predictions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.cattle c
    JOIN public.farmers f ON f.id = c.farmer_id
    WHERE c.id = predictions.cattle_id
      AND f.auth_user_id = (select auth.uid())
  )
);

-- ============================================================
-- IMAGE PREDICTIONS
-- ============================================================
DROP POLICY IF EXISTS vetronix_image_prediction_select ON public.image_predictions;
DROP POLICY IF EXISTS vetronix_image_prediction_insert ON public.image_predictions;

CREATE POLICY vetronix_image_prediction_select
ON public.image_predictions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.cattle c
    JOIN public.farmers f ON f.id = c.farmer_id
    WHERE c.id = image_predictions.cattle_id
      AND f.auth_user_id = (select auth.uid())
  )
);

CREATE POLICY vetronix_image_prediction_insert
ON public.image_predictions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.cattle c
    JOIN public.farmers f ON f.id = c.farmer_id
    WHERE c.id = image_predictions.cattle_id
      AND f.auth_user_id = (select auth.uid())
  )
);
