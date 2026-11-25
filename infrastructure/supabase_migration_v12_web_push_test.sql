CREATE OR REPLACE FUNCTION public.send_web_push_test(
  p_user_id UUID,
  p_password TEXT,
  p_endpoint TEXT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_bearer TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_user_id AND p.password_hash IS NOT NULL
      AND p.password_hash = extensions.crypt(p_password, p.password_hash)
  ) THEN RAISE EXCEPTION 'Invalid credentials'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.web_push_subscriptions s
    WHERE s.user_id = p_user_id AND s.endpoint = p_endpoint AND s.revoked_at IS NULL
  ) THEN RAISE EXCEPTION 'Push subscription not found'; END IF;

  SELECT decrypted_secret INTO v_bearer FROM vault.decrypted_secrets
    WHERE name = 'atent_edge_function_service_role_key' LIMIT 1;
  IF v_bearer IS NULL OR length(v_bearer) < 20 THEN
    RAISE EXCEPTION 'Push service is not configured';
  END IF;

  PERFORM net.http_post(
    url := 'https://ngsexidmirortoccbatd.supabase.co/functions/v1/send-emergency-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_bearer),
    body := jsonb_build_object('type', 'TEST', 'user_id', p_user_id, 'endpoint', p_endpoint),
    timeout_milliseconds := 10000
  );
END;
$$;

REVOKE ALL ON FUNCTION public.send_web_push_test(UUID, TEXT, TEXT) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.send_web_push_test(UUID, TEXT, TEXT) TO anon;
