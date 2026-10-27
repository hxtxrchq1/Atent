-- ATENT: alertas privadas, telemetría en vivo y modo viaje.
-- Ejecutar después de supabase_migration_v1.sql.

ALTER TABLE public.emergency_alerts
  ADD COLUMN IF NOT EXISTS is_in_vehicle BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.emergency_locations
  ADD COLUMN IF NOT EXISTS is_in_vehicle BOOLEAN NOT NULL DEFAULT false;

-- El cliente móvil usa una sesión de aplicación propia (profiles.id), no
-- auth.uid(). Estas funciones son la única lectura de alertas que debe usar
-- ese cliente: filtran por una relación de confianza aceptada.
CREATE OR REPLACE FUNCTION public.get_trusted_alerts(p_viewer_user_id UUID)
RETURNS TABLE (
  id UUID,
  owner_user_id UUID,
  owner_name TEXT,
  owner_avatar TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_latitude DOUBLE PRECISION,
  last_longitude DOUBLE PRECISION,
  last_accuracy DOUBLE PRECISION,
  last_battery_level INT,
  last_battery_charging BOOLEAN,
  is_in_vehicle BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.owner_user_id, p.display_name, p.avatar_url, a.status,
         a.created_at, a.updated_at, a.last_latitude, a.last_longitude,
         a.last_accuracy, a.last_battery_level, a.last_battery_charging,
         a.is_in_vehicle
    FROM public.emergency_alerts a
    JOIN public.profiles p ON p.id = a.owner_user_id
   WHERE EXISTS (
     SELECT 1 FROM public.trusted_contacts tc
      WHERE tc.user_id = p_viewer_user_id
        AND tc.trusted_user_id = a.owner_user_id
   )
   ORDER BY a.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_trusted_alert_locations(
  p_viewer_user_id UUID,
  p_alert_id UUID
)
RETURNS TABLE (
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  accuracy DOUBLE PRECISION,
  battery_level INT,
  is_charging BOOLEAN,
  is_in_vehicle BOOLEAN,
  recorded_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.latitude, l.longitude, l.accuracy, l.battery_level,
         l.is_charging, l.is_in_vehicle, l.recorded_at
    FROM public.emergency_locations l
    JOIN public.emergency_alerts a ON a.id = l.emergency_alert_id
   WHERE a.id = p_alert_id
     AND EXISTS (
       SELECT 1 FROM public.trusted_contacts tc
        WHERE tc.user_id = p_viewer_user_id
          AND tc.trusted_user_id = a.owner_user_id
     )
   ORDER BY l.recorded_at DESC
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_trusted_alerts(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_trusted_alert_locations(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_trusted_alerts(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_trusted_alert_locations(UUID, UUID) TO anon, authenticated;
