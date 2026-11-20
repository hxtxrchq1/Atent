-- Atent v1.9.3: automatic FCM push dispatch on active SOS insert.
-- pg_net queues HTTP requests asynchronously. Store the Supabase service-role JWT
-- in Vault (not in this repository) using the name documented in RELEASE_NOTES_1.9.3.

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.dispatch_atent_emergency_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, net
AS $$
DECLARE
  v_bearer text;
BEGIN
  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;

  SELECT decrypted_secret
    INTO v_bearer
    FROM vault.decrypted_secrets
   WHERE name = 'atent_edge_function_service_role_key'
   LIMIT 1;

  IF v_bearer IS NULL OR length(v_bearer) < 20 THEN
    RAISE WARNING 'Atent push dispatch skipped: Vault secret atent_edge_function_service_role_key is missing';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://ngsexidmirortoccbatd.supabase.co/functions/v1/send-emergency-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_bearer
    ),
    body := to_jsonb(NEW),
    timeout_milliseconds := 10000
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never let notification infrastructure block creating the SOS itself.
  RAISE WARNING 'Atent push dispatch enqueue failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.dispatch_atent_emergency_push() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.dispatch_atent_emergency_push() FROM anon, authenticated;

DROP TRIGGER IF EXISTS emergency_alerts_dispatch_push ON public.emergency_alerts;
CREATE TRIGGER emergency_alerts_dispatch_push
AFTER INSERT ON public.emergency_alerts
FOR EACH ROW
WHEN (NEW.status = 'active')
EXECUTE FUNCTION public.dispatch_atent_emergency_push();
