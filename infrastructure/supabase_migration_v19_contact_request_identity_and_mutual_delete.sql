-- Return the identity of pending requests only to the recipient's valid Atent
-- session. Direct profile joins are intentionally denied by profiles RLS until
-- both users have accepted the trust relationship.
CREATE OR REPLACE FUNCTION public.get_received_contact_requests_session(
  p_session_token TEXT
)
RETURNS TABLE (
  request_id UUID,
  sender_user_id UUID,
  recipient_user_id UUID,
  status TEXT,
  created_at TIMESTAMPTZ,
  sender_name TEXT,
  sender_phone TEXT,
  sender_avatar TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT s.user_id INTO v_user_id
    FROM public.pwa_sessions s
   WHERE s.token_hash = extensions.digest(convert_to(coalesce(p_session_token, ''), 'UTF8'), 'sha256')
     AND s.revoked_at IS NULL
     AND s.expires_at > pg_catalog.now()
   LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'PWA_SESSION_INVALID';
  END IF;

  RETURN QUERY
  SELECT r.id, r.sender_user_id, r.recipient_user_id, r.status, r.created_at,
         p.display_name, p.phone_normalized, p.avatar_url
    FROM public.trusted_contact_requests r
    JOIN public.profiles p ON p.id = r.sender_user_id
   WHERE r.recipient_user_id = v_user_id
     AND r.status = 'pending'
   ORDER BY r.created_at DESC;
END;
$$;

-- Remove both directed rows in one transaction, deriving the owner from the
-- same session token instead of trusting a caller-supplied owner id.
CREATE OR REPLACE FUNCTION public.remove_trusted_contact_session(
  p_session_token TEXT,
  p_contact_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_removed_count INTEGER;
BEGIN
  SELECT s.user_id INTO v_user_id
    FROM public.pwa_sessions s
   WHERE s.token_hash = extensions.digest(convert_to(coalesce(p_session_token, ''), 'UTF8'), 'sha256')
     AND s.revoked_at IS NULL
     AND s.expires_at > pg_catalog.now()
   LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'PWA_SESSION_INVALID';
  END IF;
  IF p_contact_user_id IS NULL OR p_contact_user_id = v_user_id THEN
    RAISE EXCEPTION 'INVALID_CONTACT_TARGET';
  END IF;

  DELETE FROM public.trusted_contacts tc
   WHERE (tc.user_id = v_user_id AND tc.trusted_user_id = p_contact_user_id)
      OR (tc.user_id = p_contact_user_id AND tc.trusted_user_id = v_user_id);

  GET DIAGNOSTICS v_removed_count = ROW_COUNT;
  RETURN v_removed_count;
END;
$$;

REVOKE ALL ON FUNCTION public.get_received_contact_requests_session(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remove_trusted_contact_session(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_received_contact_requests_session(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.remove_trusted_contact_session(TEXT, UUID) TO anon, authenticated;
