-- Web Push subscriptions for the existing Supabase accounts.
-- Endpoint and p256dh/auth keys are sensitive credentials; client access is limited to RPCs.
CREATE TABLE IF NOT EXISTS public.web_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  subscription JSONB NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios-pwa', 'pwa', 'web')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_web_push_subscriptions_user_active
  ON public.web_push_subscriptions(user_id) WHERE revoked_at IS NULL;

ALTER TABLE public.web_push_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.web_push_subscriptions FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.register_web_push_subscription(
  p_user_id UUID,
  p_password TEXT,
  p_endpoint TEXT,
  p_subscription JSONB,
  p_platform TEXT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_user FROM public.profiles WHERE id = p_user_id LIMIT 1;
  IF v_user.id IS NULL OR v_user.password_hash IS NULL
    OR p_password IS NULL
    OR v_user.password_hash <> extensions.crypt(p_password, v_user.password_hash) THEN
    RAISE EXCEPTION 'Invalid credentials';
  END IF;
  IF length(p_endpoint) NOT BETWEEN 20 AND 4096
    OR p_endpoint !~ '^https://'
    OR octet_length(p_subscription::text) > 8192
    OR jsonb_typeof(p_subscription) <> 'object'
    OR p_subscription #>> '{keys,p256dh}' IS NULL
    OR p_subscription #>> '{keys,auth}' IS NULL
    OR p_platform NOT IN ('ios-pwa', 'pwa', 'web') THEN
    RAISE EXCEPTION 'Invalid push subscription';
  END IF;

  INSERT INTO public.web_push_subscriptions(user_id, endpoint, subscription, platform, revoked_at, last_used_at)
  VALUES (v_user.id, p_endpoint, p_subscription, p_platform, NULL, now())
  ON CONFLICT (endpoint) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    subscription = EXCLUDED.subscription,
    platform = EXCLUDED.platform,
    revoked_at = NULL,
    last_used_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_web_push_subscription(p_user_id UUID, p_password TEXT, p_endpoint TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_user_id AND p.password_hash IS NOT NULL
      AND p.password_hash = extensions.crypt(p_password, p.password_hash)
  ) THEN RAISE EXCEPTION 'Invalid credentials'; END IF;
  UPDATE public.web_push_subscriptions
     SET revoked_at = now()
   WHERE endpoint = p_endpoint AND user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.register_web_push_subscription(UUID, TEXT, TEXT, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_web_push_subscription(UUID, TEXT, TEXT, JSONB, TEXT) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.revoke_web_push_subscription(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_web_push_subscription(UUID, TEXT, TEXT) TO anon, authenticated;
