-- Sender-side stop button for active direct trusted alerts.
CREATE OR REPLACE FUNCTION public.cancel_direct_trusted_alert(
  p_sender_user_id UUID,
  p_alert_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cancelled_count INTEGER := 0;
BEGIN
  IF p_sender_user_id IS NULL OR p_alert_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_DIRECT_ALERT_CANCEL';
  END IF;

  UPDATE public.emergency_alerts AS a
     SET status = 'resolved',
         resolved_at = now(),
         updated_at = now()
   WHERE a.id = p_alert_id
     AND a.owner_user_id = p_sender_user_id
     AND a.recipient_user_id IS NOT NULL
     AND a.trigger_source = 'DIRECT_CONTACT'
     AND a.status = 'active';

  GET DIAGNOSTICS v_cancelled_count = ROW_COUNT;
  RETURN v_cancelled_count > 0;
END;
$$;
REVOKE ALL ON FUNCTION public.cancel_direct_trusted_alert(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_direct_trusted_alert(UUID, UUID) TO anon, authenticated;
