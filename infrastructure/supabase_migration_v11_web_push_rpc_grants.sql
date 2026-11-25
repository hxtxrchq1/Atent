REVOKE EXECUTE ON FUNCTION public.register_web_push_subscription(UUID, TEXT, TEXT, JSONB, TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.revoke_web_push_subscription(UUID, TEXT, TEXT) FROM authenticated;
