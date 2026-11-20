-- Atent 1.9.6: individual trusted-contact notifications.
ALTER TABLE public.emergency_alerts
  ADD COLUMN IF NOT EXISTS recipient_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_direct_recipient
  ON public.emergency_alerts(recipient_user_id, status, created_at DESC)
  WHERE recipient_user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_trusted_alerts(p_viewer_user_id UUID)
RETURNS TABLE (
  id UUID, owner_user_id UUID, owner_name TEXT, owner_avatar TEXT, status TEXT,
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  last_latitude DOUBLE PRECISION, last_longitude DOUBLE PRECISION,
  last_accuracy DOUBLE PRECISION, last_battery_level INT,
  last_battery_charging BOOLEAN, is_in_vehicle BOOLEAN
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.owner_user_id, p.display_name, p.avatar_url, a.status,
         a.created_at, a.updated_at, a.last_latitude, a.last_longitude,
         a.last_accuracy, a.last_battery_level, a.last_battery_charging,
         a.is_in_vehicle
    FROM public.emergency_alerts a
    JOIN public.profiles p ON p.id = a.owner_user_id
   WHERE a.recipient_user_id = p_viewer_user_id
      OR EXISTS (
        SELECT 1 FROM public.trusted_contacts tc
        WHERE tc.user_id = p_viewer_user_id
          AND tc.trusted_user_id = a.owner_user_id
      )
   ORDER BY a.created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.get_trusted_alerts(UUID) FROM PUBLIC;
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
  INSERT INTO public.emergency_alerts (owner_user_id, recipient_user_id, status, trigger_source)
  VALUES (p_sender_user_id, p_recipient_user_id, 'active', 'DIRECT_CONTACT')
  RETURNING id INTO v_alert_id;
  RETURN v_alert_id;
END;
$$;
REVOKE ALL ON FUNCTION public.send_direct_trusted_alert(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_direct_trusted_alert(UUID, UUID) TO anon, authenticated;
