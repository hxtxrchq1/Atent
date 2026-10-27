-- Atent V1 - Endurecimiento de autenticación telefónica
-- Aplicar después de supabase_migration_v1.sql.
-- Las RPC reciben argumentos tipados y nunca construyen SQL dinámico.

CREATE OR REPLACE FUNCTION public.app_register_user(
    p_legal_name TEXT,
    p_legal_surname TEXT,
    p_phone_prefix TEXT,
    p_phone_national TEXT,
    p_phone_normalized TEXT,
    p_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_user_id UUID;
    v_hash TEXT;
BEGIN
    IF p_legal_name IS NULL OR length(btrim(p_legal_name)) NOT BETWEEN 1 AND 80 OR p_legal_name ~ '[[:cntrl:]]'
       OR p_legal_surname IS NULL OR length(btrim(p_legal_surname)) NOT BETWEEN 1 AND 80 OR p_legal_surname ~ '[[:cntrl:]]' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Los datos personales no tienen un formato válido');
    END IF;

    IF p_phone_prefix IS NULL OR p_phone_prefix !~ '^\+[1-9][0-9]{0,3}$'
       OR p_phone_national IS NULL OR p_phone_national !~ '^[0-9]{7,15}$'
       OR p_phone_normalized IS NULL OR p_phone_normalized !~ '^\+[1-9][0-9]{7,14}$' THEN
        RETURN jsonb_build_object('success', false, 'error', 'El número telefónico no tiene un formato válido');
    END IF;

    IF p_password IS NULL OR length(p_password) NOT BETWEEN 6 AND 128 OR p_password ~ '[[:cntrl:]]' THEN
        RETURN jsonb_build_object('success', false, 'error', 'La contraseña no tiene un formato válido');
    END IF;

    IF EXISTS (SELECT 1 FROM public.profiles WHERE phone_normalized = p_phone_normalized) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Este número ya tiene una cuenta. Inicia sesión o recupera tu acceso.');
    END IF;

    v_user_id := gen_random_uuid();
    v_hash := crypt(p_password, gen_salt('bf', 10));

    BEGIN
        INSERT INTO public.profiles (
            id, legal_name, legal_surname, display_name, phone_prefix,
            phone_national, phone_normalized, avatar_url, password_hash
        ) VALUES (
            v_user_id, btrim(p_legal_name), btrim(p_legal_surname), btrim(p_legal_name),
            p_phone_prefix, p_phone_national, p_phone_normalized, 'FELIZ', v_hash
        );
    EXCEPTION WHEN unique_violation THEN
        RETURN jsonb_build_object('success', false, 'error', 'Este número ya tiene una cuenta. Inicia sesión o recupera tu acceso.');
    END;

    RETURN jsonb_build_object(
        'success', true,
        'user', jsonb_build_object(
            'id', v_user_id,
            'legal_name', btrim(p_legal_name),
            'legal_surname', btrim(p_legal_surname),
            'display_name', btrim(p_legal_name),
            'phone_prefix', p_phone_prefix,
            'phone_national', p_phone_national,
            'phone_normalized', p_phone_normalized,
            'avatar_url', 'FELIZ'
        )
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.app_login_user(
    p_phone_normalized TEXT,
    p_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    prof RECORD;
BEGIN
    IF p_phone_normalized IS NULL OR p_phone_normalized !~ '^\+[1-9][0-9]{7,14}$'
       OR p_password IS NULL OR length(p_password) NOT BETWEEN 1 AND 128 OR p_password ~ '[[:cntrl:]]' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Número telefónico o contraseña incorrectos');
    END IF;

    SELECT id, legal_name, legal_surname, display_name, phone_prefix,
           phone_national, phone_normalized, avatar_url, password_hash
      INTO prof
      FROM public.profiles
     WHERE phone_normalized = p_phone_normalized
     LIMIT 1;

    IF prof IS NULL OR prof.password_hash IS NULL OR prof.password_hash <> crypt(p_password, prof.password_hash) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Número telefónico o contraseña incorrectos');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'user', jsonb_build_object(
            'id', prof.id,
            'legal_name', prof.legal_name,
            'legal_surname', prof.legal_surname,
            'display_name', prof.display_name,
            'phone_prefix', prof.phone_prefix,
            'phone_national', prof.phone_national,
            'phone_normalized', prof.phone_normalized,
            'avatar_url', prof.avatar_url
        )
    );
END;
$$;

REVOKE ALL ON FUNCTION public.app_register_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_login_user(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_register_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_login_user(TEXT, TEXT) TO anon, authenticated;
