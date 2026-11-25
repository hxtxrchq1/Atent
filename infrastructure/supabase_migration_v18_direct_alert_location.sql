-- Keep the existing two-argument RPC unchanged for installed clients. This
-- additive variant creates a direct alert and its initial GPS point atomically.
CREATE OR REPLACE FUNCTION public.send_direct_trusted_alert_with_location(
  p_sender_user_id UUID,
  p_recipient_user_id UUID,
  p_latitude DOUBLE PRECISION DEFAULT NULL,
  p_longitude DOUBLE PRECISION DEFAULT NULL,
  p_accuracy DOUBLE PRECISION DEFAULT NULL,
  p_recorded_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alert_id UUID;
BEGIN
  IF p_sender_user_id IS NULL OR p_recipient_user_id IS NULL OR p_sender_user_id = p_recipient_user_id THEN
    RAISE EXCEPTION 'INVALID_DIRECT_ALERT_TARGET';
  END IF;

  -- Match the existing RPC's trust and rate-limit checks.
  IF NOT EXISTS (
    SELECT 1 FROM public.trusted_contacts tc
    WHERE tc.user_id = p_sender_user_id AND tc.trusted_user_id = p_recipient_user_id
  ) OR NOT EXISTS (
    SELECT 1 FROM public.trusted_contacts tc
    WHERE tc.user_id = p_recipient_user_id AND tc.trusted_user_id = p_sender_user_id
  ) THEN
    RAISE EXCEPTION 'DIRECT_ALERT_REQUIRES_MUTUAL_TRUST';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.emergency_alerts a
    WHERE a.owner_user_id = p_sender_user_id
      AND a.recipient_user_id = p_recipient_user_id
      AND a.trigger_source = 'DIRECT_CONTACT'
      AND a.created_at >= now() - INTERVAL '1 minute'
  ) THEN
    RAISE EXCEPTION 'DIRECT_ALERT_RATE_LIMIT';
  END IF;

  IF (p_latitude IS NULL) <> (p_longitude IS NULL)
     OR (p_latitude IS NOT NULL AND (p_latitude < -90 OR p_latitude > 90))
     OR (p_longitude IS NOT NULL AND (p_longitude < -180 OR p_longitude > 180))
     OR (p_accuracy IS NOT NULL AND p_accuracy < 0) THEN
    RAISE EXCEPTION 'INVALID_DIRECT_ALERT_LOCATION';
  END IF;

  INSERT INTO public.emergency_alerts (
    owner_user_id, recipient_user_id, direct_alert_expires_at, status,
    trigger_source, initial_latitude, initial_longitude, initial_accuracy,
    last_latitude, last_longitude, last_accuracy
  ) VALUES (
    p_sender_user_id, p_recipient_user_id, now() + INTERVAL '10 minutes', 'active',
    'DIRECT_CONTACT', p_latitude, p_longitude, p_accuracy,
    p_latitude, p_longitude, p_accuracy
  ) RETURNING id INTO v_alert_id;

  IF p_latitude IS NOT NULL THEN
    INSERT INTO public.emergency_locations (
      emergency_alert_id, latitude, longitude, accuracy, recorded_at
    ) VALUES (
      v_alert_id, p_latitude, p_longitude, p_accuracy, COALESCE(p_recorded_at, now())
    );
  END IF;

  RETURN v_alert_id;
END;
$$;

REVOKE ALL ON FUNCTION public.send_direct_trusted_alert_with_location(UUID, UUID, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_direct_trusted_alert_with_location(UUID, UUID, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, TIMESTAMPTZ) TO anon, authenticated;
