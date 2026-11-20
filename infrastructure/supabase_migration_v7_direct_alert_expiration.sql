-- Atent 1.9.6: expire targeted notifications and expose their type to clients.
ALTER TABLE public.emergency_alerts
  ADD COLUMN IF NOT EXISTS direct_alert_expires_at TIMESTAMPTZ;
UPDATE public.emergency_alerts
   SET direct_alert_expires_at = created_at + INTERVAL '10 minutes'
 WHERE recipient_user_id IS NOT NULL
   AND direct_alert_expires_at IS NULL;

DROP FUNCTION IF EXISTS public.get_trusted_alerts(UUID);
CREATE FUNCTION public.get_trusted_alerts(p_viewer_user_id UUID)
RETURNS TABLE (
  id UUID, owner_user_id UUID, owner_name TEXT, owner_avatar TEXT, status TEXT,
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  last_latitude DOUBLE PRECISION, last_longitude DOUBLE PRECISION,
  last_accuracy DOUBLE PRECISION, last_battery_level INT,
  last_battery_charging BOOLEAN, is_in_vehicle BOOLEAN,
  recipient_user_id UUID, last_recorded_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Direct notifications are transient: expire them after 10 minutes.
  UPDATE public.emergency_alerts
     SET status = 'resolved', resolved_at = now(), updated_at = now()
   WHERE recipient_user_id IS NOT NULL
     AND status = 'active'
     AND direct_alert_expires_at IS NOT NULL
     AND direct_alert_expires_at <= now();

  RETURN QUERY
  SELECT a.id, a.owner_user_id, p.display_name, p.avatar_url, a.status,
         a.created_at, a.updated_at, a.last_latitude, a.last_longitude,
         a.last_accuracy, a.last_battery_level, a.last_battery_charging,
         a.is_in_vehicle, a.recipient_user_id, latest.recorded_at
    FROM public.emergency_alerts a
    JOIN public.profiles p ON p.id = a.owner_user_id
    LEFT JOIN LATERAL (
      SELECT l.recorded_at FROM public.emergency_locations l
       WHERE l.emergency_alert_id = a.id
       ORDER BY l.recorded_at DESC LIMIT 1
    ) latest ON true
   WHERE (a.recipient_user_id = p_viewer_user_id AND a.status = 'active')
      OR (a.recipient_user_id IS NULL AND EXISTS (
        SELECT 1 FROM public.trusted_contacts tc
        WHERE tc.user_id = p_viewer_user_id
          AND tc.trusted_user_id = a.owner_user_id
      ))
   ORDER BY a.created_at DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_trusted_alerts(UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.send_direct_trusted_alert(
  p_sender_user_id UUID,
  p_recipient_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_alert_id UUID;
BEGIN
  IF p_sender_user_id IS NULL OR p_recipient_user_id IS NULL OR p_sender_user_id = p_recipient_user_id THEN
    RAISE EXCEPTION 'INVALID_DIRECT_ALERT_TARGET';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.trusted_contacts tc
    WHERE tc.user_id = p_sender_user_id AND tc.trusted_user_id = p_recipient_user_id
  ) OR NOT EXISTS (
    SELECT 1 FROM public.trusted_contacts tc
    WHERE tc.user_id = p_recipient_user_id AND tc.trusted_user_id = p_sender_user_id
  ) THEN
    RAISE EXCEPTION 'DIRECT_ALERT_REQUIRES_MUTUAL_TRUST';
  END IF;
  INSERT INTO public.emergency_alerts (owner_user_id, recipient_user_id, direct_alert_expires_at, status, trigger_source)
  VALUES (p_sender_user_id, p_recipient_user_id, now() + INTERVAL '10 minutes', 'active', 'DIRECT_CONTACT')
  RETURNING id INTO v_alert_id;
  RETURN v_alert_id;
END;
$$;
REVOKE ALL ON FUNCTION public.send_direct_trusted_alert(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_direct_trusted_alert(UUID, UUID) TO anon, authenticated;
