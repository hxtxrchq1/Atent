-- Atent Release 1.2.1
-- La hora mostrada al receptor debe ser la hora de la lectura GPS, no la hora
-- de la última escritura del agregado emergency_alerts.

DROP FUNCTION IF EXISTS public.get_trusted_alerts(UUID);

CREATE FUNCTION public.get_trusted_alerts(p_viewer_user_id UUID)
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
  is_in_vehicle BOOLEAN,
  last_recorded_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.owner_user_id, p.display_name, p.avatar_url, a.status,
         a.created_at, a.updated_at, a.last_latitude, a.last_longitude,
         a.last_accuracy, a.last_battery_level, a.last_battery_charging,
         a.is_in_vehicle, latest.recorded_at
    FROM public.emergency_alerts a
    JOIN public.profiles p ON p.id = a.owner_user_id
    LEFT JOIN LATERAL (
      SELECT l.recorded_at
        FROM public.emergency_locations l
       WHERE l.emergency_alert_id = a.id
       ORDER BY l.recorded_at DESC
       LIMIT 1
    ) latest ON true
   WHERE EXISTS (
     SELECT 1 FROM public.trusted_contacts tc
      WHERE tc.user_id = p_viewer_user_id
        AND tc.trusted_user_id = a.owner_user_id
   )
   ORDER BY a.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_trusted_alerts(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_trusted_alerts(UUID) TO anon, authenticated;
