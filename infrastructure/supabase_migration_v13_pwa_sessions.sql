CREATE TABLE IF NOT EXISTS public.pwa_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token_hash BYTEA NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pwa_sessions_user_active
  ON public.pwa_sessions(user_id, expires_at) WHERE revoked_at IS NULL;

ALTER TABLE public.pwa_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pwa_sessions FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.issue_pwa_session(p_user_id UUID, p_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_password_hash TEXT;
  v_token TEXT;
  v_expires_at TIMESTAMPTZ := now() + interval '30 days';
BEGIN
  SELECT password_hash INTO v_password_hash FROM public.profiles WHERE id = p_user_id;
  IF v_password_hash IS NULL OR p_password IS NULL
     OR v_password_hash <> extensions.crypt(p_password, v_password_hash) THEN
    RAISE EXCEPTION 'Invalid credentials';
  END IF;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  INSERT INTO public.pwa_sessions(user_id, token_hash, expires_at)
  VALUES (p_user_id, extensions.digest(convert_to(v_token, 'UTF8'), 'sha256'), v_expires_at);

  RETURN jsonb_build_object('token', v_token, 'expires_at', v_expires_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_pwa_session(p_session_token TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.pwa_sessions
     SET revoked_at = now()
   WHERE token_hash = extensions.digest(convert_to(coalesce(p_session_token, ''), 'UTF8'), 'sha256')
     AND revoked_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.register_web_push_subscription_session(
  p_session_token TEXT,
  p_endpoint TEXT,
  p_subscription JSONB,
  p_platform TEXT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user_id UUID;
BEGIN
  SELECT user_id INTO v_user_id FROM public.pwa_sessions
   WHERE token_hash = extensions.digest(convert_to(coalesce(p_session_token, ''), 'UTF8'), 'sha256')
     AND revoked_at IS NULL AND expires_at > now()
   LIMIT 1;
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Web session expired; sign in again'; END IF;
  IF length(p_endpoint) NOT BETWEEN 20 AND 4096 OR p_endpoint !~ '^https://'
    OR octet_length(p_subscription::text) > 8192 OR jsonb_typeof(p_subscription) <> 'object'
    OR p_subscription #>> '{keys,p256dh}' IS NULL OR p_subscription #>> '{keys,auth}' IS NULL
    OR p_platform NOT IN ('ios-pwa', 'pwa', 'web') THEN
    RAISE EXCEPTION 'Invalid push subscription';
  END IF;
  INSERT INTO public.web_push_subscriptions(user_id, endpoint, subscription, platform, revoked_at, last_used_at)
  VALUES (v_user_id, p_endpoint, p_subscription, p_platform, NULL, now())
  ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id,
    subscription = EXCLUDED.subscription, platform = EXCLUDED.platform,
    revoked_at = NULL, last_used_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_web_push_subscription_session(p_session_token TEXT, p_endpoint TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user_id UUID;
BEGIN
  SELECT user_id INTO v_user_id FROM public.pwa_sessions
   WHERE token_hash = extensions.digest(convert_to(coalesce(p_session_token, ''), 'UTF8'), 'sha256')
     AND revoked_at IS NULL AND expires_at > now()
   LIMIT 1;
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Web session expired; sign in again'; END IF;
  UPDATE public.web_push_subscriptions SET revoked_at = now()
   WHERE endpoint = p_endpoint AND user_id = v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.issue_pwa_session(UUID, TEXT) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.revoke_pwa_session(TEXT) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.register_web_push_subscription_session(TEXT, TEXT, JSONB, TEXT) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.revoke_web_push_subscription_session(TEXT, TEXT) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_pwa_session(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.revoke_pwa_session(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.register_web_push_subscription_session(TEXT, TEXT, JSONB, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.revoke_web_push_subscription_session(TEXT, TEXT) TO anon;

CREATE OR REPLACE FUNCTION public.send_web_push_test_session(p_session_token TEXT, p_endpoint TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_user_id UUID;
  v_bearer TEXT;
BEGIN
  SELECT user_id INTO v_user_id FROM public.pwa_sessions
   WHERE token_hash = extensions.digest(convert_to(coalesce(p_session_token, ''), 'UTF8'), 'sha256')
     AND revoked_at IS NULL AND expires_at > now()
   LIMIT 1;
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Web session expired; sign in again'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.web_push_subscriptions s
    WHERE s.user_id = v_user_id AND s.endpoint = p_endpoint AND s.revoked_at IS NULL) THEN
    RAISE EXCEPTION 'Push subscription not found';
  END IF;
  SELECT decrypted_secret INTO v_bearer FROM vault.decrypted_secrets
    WHERE name = 'atent_edge_function_service_role_key' LIMIT 1;
  IF v_bearer IS NULL OR length(v_bearer) < 20 THEN RAISE EXCEPTION 'Push service is not configured'; END IF;
  PERFORM net.http_post(
    url := 'https://ngsexidmirortoccbatd.supabase.co/functions/v1/send-emergency-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_bearer),
    body := jsonb_build_object('type', 'TEST', 'user_id', v_user_id, 'endpoint', p_endpoint),
    timeout_milliseconds := 10000
  );
END;
$$;

REVOKE ALL ON FUNCTION public.send_web_push_test_session(TEXT, TEXT) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.send_web_push_test_session(TEXT, TEXT) TO anon;
