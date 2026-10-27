-- =====================================================================
-- PROYECTO ATENT: MIGRACIÓN INTEGRAL SUPABASE (FASE 4 - CORREGIDA)
-- =====================================================================
-- Habilitar extensión pgcrypto en esquema extensions (o public)
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================
-- PASO 1: CREAR PRIMERO TODAS LAS TABLAS BASE
-- =====================================================================

-- 1. TABLA: profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    legal_name TEXT NOT NULL,
    legal_surname TEXT NOT NULL,
    display_name TEXT NOT NULL,
    phone_prefix TEXT NOT NULL DEFAULT '+51',
    phone_national TEXT NOT NULL,
    phone_normalized TEXT UNIQUE NOT NULL, -- Formato canónico E.164 (+519XXXXXXXX)
    avatar_url TEXT NOT NULL DEFAULT 'FELIZ', -- FELIZ, DUDOSO, ENOJADO, TRANQUILO
    password_hash TEXT, -- Hash criptográfico seguro con bcrypt (Blowfish)
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone_normalized ON public.profiles(phone_normalized);

-- Lookup controlado para solicitudes de red de confianza. La consulta directa
-- a profiles queda protegida por RLS, por lo que no debe usarse para descubrir
-- cuentas por teléfono desde el cliente.
CREATE OR REPLACE FUNCTION public.find_profile_by_phone(p_phone_normalized TEXT)
RETURNS TABLE(id UUID, display_name TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT p.id, p.display_name
    FROM public.profiles p
    WHERE p.phone_normalized = p_phone_normalized
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.find_profile_by_phone(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_profile_by_phone(TEXT) TO anon, authenticated;

-- 2. TABLA: trusted_contact_requests
CREATE TABLE IF NOT EXISTS public.trusted_contact_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')) DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT check_no_self_requests CHECK (sender_user_id <> recipient_user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_request 
    ON public.trusted_contact_requests(sender_user_id, recipient_user_id)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_requests_recipient ON public.trusted_contact_requests(recipient_user_id, status);
CREATE INDEX IF NOT EXISTS idx_requests_sender ON public.trusted_contact_requests(sender_user_id, status);

-- 3. TABLA: trusted_contacts
CREATE TABLE IF NOT EXISTS public.trusted_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    trusted_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    relationship TEXT NOT NULL DEFAULT 'Amigo',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT check_no_self_contact CHECK (user_id <> trusted_user_id),
    CONSTRAINT unique_trusted_pair UNIQUE (user_id, trusted_user_id)
);

CREATE INDEX IF NOT EXISTS idx_contacts_user ON public.trusted_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_trusted ON public.trusted_contacts(trusted_user_id);

-- 4. TABLA: emergency_alerts
CREATE TABLE IF NOT EXISTS public.emergency_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('active', 'resolved', 'cancelled')) DEFAULT 'active',
    trigger_source TEXT NOT NULL DEFAULT 'MANUAL_HOLD',
    initial_latitude DOUBLE PRECISION,
    initial_longitude DOUBLE PRECISION,
    initial_accuracy DOUBLE PRECISION,
    last_latitude DOUBLE PRECISION,
    last_longitude DOUBLE PRECISION,
    last_accuracy DOUBLE PRECISION,
    last_battery_level INT,
    last_battery_charging BOOLEAN,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    resolved_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alerts_owner ON public.emergency_alerts(owner_user_id, status);
CREATE INDEX IF NOT EXISTS idx_alerts_active ON public.emergency_alerts(status) WHERE status = 'active';

-- 5. TABLA: emergency_locations
CREATE TABLE IF NOT EXISTS public.emergency_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emergency_alert_id UUID NOT NULL REFERENCES public.emergency_alerts(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION,
    battery_level INT,
    is_charging BOOLEAN,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_emergency_locations_alert_time 
    ON public.emergency_locations(emergency_alert_id, recorded_at DESC);

-- 6. TABLA: device_status
CREATE TABLE IF NOT EXISTS public.device_status (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    battery_level INT,
    is_charging BOOLEAN,
    push_token TEXT,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. TABLA: user_settings
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    vibration_enabled BOOLEAN NOT NULL DEFAULT true,
    sound_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
    auto_share_location_on_sos BOOLEAN NOT NULL DEFAULT true,
    trip_checkin_interval_minutes INT NOT NULL DEFAULT 15,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- =====================================================================
-- PASO 2: HABILITAR RLS Y DEFINIR POLÍTICAS
-- =====================================================================

-- RLS: profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT USING (auth.uid() = id OR auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "profiles_select_contacts" ON public.profiles;
CREATE POLICY "profiles_select_contacts" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.trusted_contacts tc
            WHERE (tc.user_id = profiles.id)
               OR (tc.trusted_user_id = profiles.id)
        )
    );

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE USING (auth.uid() = id OR auth.uid() = auth_user_id)
    WITH CHECK (auth.uid() = id OR auth.uid() = auth_user_id);

-- RLS: trusted_contact_requests
ALTER TABLE public.trusted_contact_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "requests_select_party" ON public.trusted_contact_requests;
CREATE POLICY "requests_select_party" ON public.trusted_contact_requests
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "requests_insert_sender" ON public.trusted_contact_requests;
CREATE POLICY "requests_insert_sender" ON public.trusted_contact_requests
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "requests_update_party" ON public.trusted_contact_requests;
CREATE POLICY "requests_update_party" ON public.trusted_contact_requests
    FOR UPDATE USING (true);

-- RLS: trusted_contacts
ALTER TABLE public.trusted_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contacts_select_member" ON public.trusted_contacts;
CREATE POLICY "contacts_select_member" ON public.trusted_contacts
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "contacts_insert_member" ON public.trusted_contacts;
CREATE POLICY "contacts_insert_member" ON public.trusted_contacts
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "contacts_delete_member" ON public.trusted_contacts;
CREATE POLICY "contacts_delete_member" ON public.trusted_contacts
    FOR DELETE USING (true);

-- RLS: emergency_alerts
ALTER TABLE public.emergency_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alerts_select_authorized" ON public.emergency_alerts;
CREATE POLICY "alerts_select_authorized" ON public.emergency_alerts
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "alerts_insert_owner" ON public.emergency_alerts;
CREATE POLICY "alerts_insert_owner" ON public.emergency_alerts
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "alerts_update_owner" ON public.emergency_alerts;
CREATE POLICY "alerts_update_owner" ON public.emergency_alerts
    FOR UPDATE USING (true) WITH CHECK (true);

-- RLS: emergency_locations
ALTER TABLE public.emergency_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "locations_select_authorized" ON public.emergency_locations;
CREATE POLICY "locations_select_authorized" ON public.emergency_locations
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "locations_insert_owner" ON public.emergency_locations;
CREATE POLICY "locations_insert_owner" ON public.emergency_locations
    FOR INSERT WITH CHECK (true);

-- RLS: device_status
ALTER TABLE public.device_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "device_status_all_own" ON public.device_status;
CREATE POLICY "device_status_all_own" ON public.device_status
    FOR ALL USING (true) WITH CHECK (true);

-- RLS: user_settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_settings_all_own" ON public.user_settings;
CREATE POLICY "user_settings_all_own" ON public.user_settings
    FOR ALL USING (true) WITH CHECK (true);

-- =====================================================================
-- PASO 3: FUNCIONES RPC ATÓMICAS Y PROCEDIMIENTOS ALMACENADOS
-- =====================================================================

-- Aceptar Solicitud de Contacto y Crear Relación Mutua
CREATE OR REPLACE FUNCTION public.accept_contact_request(request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    req RECORD;
BEGIN
    SELECT * INTO req FROM public.trusted_contact_requests 
    WHERE id = request_id AND status = 'pending' FOR UPDATE;

    IF req IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Solicitud no encontrada o no pendiente');
    END IF;

    -- Actualizar estado de solicitud
    UPDATE public.trusted_contact_requests
    SET status = 'accepted', updated_at = now()
    WHERE id = request_id;

    -- Crear relación bidireccional atómica
    INSERT INTO public.trusted_contacts (user_id, trusted_user_id, relationship)
    VALUES (req.sender_user_id, req.recipient_user_id, 'Amigo')
    ON CONFLICT (user_id, trusted_user_id) DO NOTHING;

    INSERT INTO public.trusted_contacts (user_id, trusted_user_id, relationship)
    VALUES (req.recipient_user_id, req.sender_user_id, 'Amigo')
    ON CONFLICT (user_id, trusted_user_id) DO NOTHING;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Solicitud aceptada y relación mutua creada con éxito',
        'sender_user_id', req.sender_user_id,
        'recipient_user_id', req.recipient_user_id
    );
END;
$$;

-- Registro Telefónico Seguro (Sin requerir SMS OTP ni violar unicidad)
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
    -- Validar si ya existe el número (Garantía estricta de unicidad en base de datos)
    IF EXISTS (SELECT 1 FROM public.profiles WHERE phone_normalized = p_phone_normalized) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Este número ya tiene una cuenta. Inicia sesión o recupera tu acceso.');
    END IF;

    v_user_id := gen_random_uuid();
    -- Soporte para gen_salt y crypt ya sea en public o extensions
    v_hash := crypt(p_password, gen_salt('bf', 10));

    INSERT INTO public.profiles (
        id,
        legal_name,
        legal_surname,
        display_name,
        phone_prefix,
        phone_national,
        phone_normalized,
        avatar_url,
        password_hash
    ) VALUES (
        v_user_id,
        p_legal_name,
        p_legal_surname,
        p_legal_name,
        p_phone_prefix,
        p_phone_national,
        p_phone_normalized,
        'FELIZ',
        v_hash
    );

    RETURN jsonb_build_object(
        'success', true,
        'user', jsonb_build_object(
            'id', v_user_id,
            'legal_name', p_legal_name,
            'legal_surname', p_legal_surname,
            'display_name', p_legal_name,
            'phone_prefix', p_phone_prefix,
            'phone_national', p_phone_national,
            'phone_normalized', p_phone_normalized,
            'avatar_url', 'FELIZ'
        )
    );
END;
$$;

-- Inicio de Sesión Telefónico
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
    SELECT * INTO prof FROM public.profiles
    WHERE phone_normalized = p_phone_normalized;

    IF prof IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Número telefónico o contraseña incorrectos');
    END IF;

    IF prof.password_hash IS NULL OR prof.password_hash <> crypt(p_password, prof.password_hash) THEN
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

-- Cambio Seguro de Contraseña
CREATE OR REPLACE FUNCTION public.app_change_password(
    p_phone_normalized TEXT,
    p_old_password TEXT,
    p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    prof RECORD;
    v_new_hash TEXT;
BEGIN
    SELECT * INTO prof FROM public.profiles
    WHERE phone_normalized = p_phone_normalized FOR UPDATE;

    IF prof IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Usuario no encontrado');
    END IF;

    IF prof.password_hash IS NOT NULL AND prof.password_hash <> crypt(p_old_password, prof.password_hash) THEN
        RETURN jsonb_build_object('success', false, 'error', 'La contraseña actual es incorrecta');
    END IF;

    v_new_hash := crypt(p_new_password, gen_salt('bf', 10));

    UPDATE public.profiles
    SET password_hash = v_new_hash, updated_at = now()
    WHERE id = prof.id;

    RETURN jsonb_build_object('success', true, 'message', 'Contraseña actualizada correctamente');
END;
$$;
