-- Rate-limit direct-contact alerts to avoid notification abuse.
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_direct_sender_recipient
  ON public.emergency_alerts(owner_user_id, recipient_user_id, created_at DESC)
  WHERE recipient_user_id IS NOT NULL;

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
  IF EXISTS (
    SELECT 1 FROM public.emergency_alerts a
    WHERE a.owner_user_id = p_sender_user_id
      AND a.recipient_user_id = p_recipient_user_id
      AND a.trigger_source = 'DIRECT_CONTACT'
      AND a.created_at >= now() - INTERVAL '1 minute'
  ) THEN
    RAISE EXCEPTION 'DIRECT_ALERT_RATE_LIMIT';
  END IF;
  INSERT INTO public.emergency_alerts (owner_user_id, recipient_user_id, direct_alert_expires_at, status, trigger_source)
  VALUES (p_sender_user_id, p_recipient_user_id, now() + INTERVAL '10 minutes', 'active', 'DIRECT_CONTACT')
  RETURNING id INTO v_alert_id;
  RETURN v_alert_id;
END;
$$;
REVOKE ALL ON FUNCTION public.send_direct_trusted_alert(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_direct_trusted_alert(UUID, UUID) TO anon, authenticated;
