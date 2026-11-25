import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json' },
});

function base64Url(value: Uint8Array | string): string {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function pemToBytes(pem: string): Uint8Array {
  const raw = atob(pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, ''));
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

async function googleAccessToken(serviceAccount: Record<string, string>): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64Url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claim}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToBytes(serviceAccount.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned),
  );
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${unsigned}.${base64Url(new Uint8Array(signature))}`,
  });
  if (!response.ok) throw new Error(`Google OAuth failed: ${response.status}`);
  return (await response.json()).access_token;
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'POST required' }, 405);
  try {
    const payload = await request.json();
    if (payload.type === 'TEST') {
      const userId = String(payload.user_id || '');
      const endpoint = String(payload.endpoint || '');
      if (!userId || !endpoint) return json({ error: 'Invalid test target' }, 400);
      const { data: target, error: targetError } = await supabase
        .from('web_push_subscriptions')
        .select('id, subscription')
        .eq('user_id', userId)
        .eq('endpoint', endpoint)
        .is('revoked_at', null)
        .maybeSingle();
      if (targetError) throw targetError;
      if (!target) return json({ error: 'Push subscription not found' }, 404);
      const subject = Deno.env.get('VAPID_SUBJECT');
      const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
      const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
      if (!subject || !publicKey || !privateKey) throw new Error('VAPID secrets are not configured');
      webpush.setVapidDetails(subject, publicKey, privateKey);
      try {
        await webpush.sendNotification(target.subscription, JSON.stringify({
          title: 'Atent: prueba de sonido',
          body: 'Si recibes este aviso, las notificaciones de Atent están activas en este iPhone.',
          data: { url: '/?push-test=1' },
        }), { TTL: 60 });
        return json({ sent: 1 });
      } catch (error) {
        const status = Number((error as { statusCode?: number }).statusCode || 0);
        if (status === 404 || status === 410) {
          await supabase.from('web_push_subscriptions')
            .update({ revoked_at: new Date().toISOString() }).eq('id', target.id);
        }
        return json({ error: 'WEB_PUSH_TEST_FAILED', status }, status === 404 || status === 410 ? 410 : 502);
      }
    }
    const record = payload.record ?? payload;
    if (payload.type && payload.type !== 'INSERT') return json({ ignored: true });
    if (!record.id || !record.owner_user_id || record.status !== 'active') return json({ ignored: true });

    const { data: relationships, error: relationError } = await supabase
      .from('trusted_contacts')
      .select('user_id, trusted_user_id')
      .or(`user_id.eq.${record.owner_user_id},trusted_user_id.eq.${record.owner_user_id}`);
    if (relationError) throw relationError;

    const recipientIds = record.recipient_user_id
      ? [String(record.recipient_user_id)]
      : [...new Set((relationships ?? []).map((row) =>
          row.user_id === record.owner_user_id ? row.trusted_user_id : row.user_id,
        ))];
    if (recipientIds.length === 0) return json({ attempted: 0, sent: 0, failed: 0, reason: 'NO_TRUSTED_CONTACTS' });

    const [{ data: devices, error: deviceError }, { data: ownerProfile, error: profileError }] = await Promise.all([
      supabase.from('device_status').select('user_id, push_token').in('user_id', recipientIds).not('push_token', 'is', null),
      supabase.from('profiles').select('display_name').eq('id', record.owner_user_id).maybeSingle(),
    ]);
    if (deviceError) throw deviceError;
    if (profileError) throw profileError;

    const targets = (devices ?? []).filter((device) => Boolean(device.push_token));
    const ownerName = ownerProfile?.display_name || 'Tu contacto de confianza';
    let fcmSent = 0;
    const fcmFailureStatuses: number[] = [];
    if (targets.length > 0) {
      try {
        const serviceAccount = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON')!);
        const accessToken = await googleAccessToken(serviceAccount);
        for (const device of targets) {
          const response = await fetch(`https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`, {
            method: 'POST',
            headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
            body: JSON.stringify({ message: {
              token: device.push_token,
              // Preserve the existing Android data-only high-priority delivery.
              data: { alertId: String(record.id), ownerName, alertType: record.recipient_user_id ? 'DIRECT' : 'SOS' },
              android: { priority: 'HIGH', ttl: '600s' },
            } }),
          });
          if (response.ok) fcmSent += 1;
          else fcmFailureStatuses.push(response.status);
        }
      } catch {
        fcmFailureStatuses.push(0);
      }
    }

    const { data: webTargets, error: webTargetError } = await supabase
      .from('web_push_subscriptions')
      .select('id, subscription')
      .in('user_id', recipientIds)
      .is('revoked_at', null);
    if (webTargetError) throw webTargetError;

    let webSent = 0;
    const webFailureStatuses: number[] = [];
    if ((webTargets ?? []).length > 0) {
      const vapidSubject = Deno.env.get('VAPID_SUBJECT');
      const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
      const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
      if (!vapidSubject || !vapidPublicKey || !vapidPrivateKey) {
        throw new Error('VAPID secrets are not configured');
      }
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
      const message = JSON.stringify({
        title: '🚨 Alerta de Atent',
        body: `${ownerName} necesita tu atención.`,
        data: {
          alertId: String(record.id),
          alertType: record.recipient_user_id ? 'DIRECT' : 'SOS',
          url: `/?alert=${encodeURIComponent(String(record.id))}`,
        },
      });
      for (const target of webTargets ?? []) {
        try {
          await webpush.sendNotification(target.subscription, message, { TTL: 600 });
          webSent += 1;
        } catch (error) {
          const status = Number((error as { statusCode?: number }).statusCode || 0);
          webFailureStatuses.push(status);
          if (status === 404 || status === 410) {
            await supabase.from('web_push_subscriptions')
              .update({ revoked_at: new Date().toISOString() })
              .eq('id', target.id);
          }
        }
      }
    }

    return json({
      fcm: { attempted: targets.length, sent: fcmSent, failed: fcmFailureStatuses.length, failureStatuses: fcmFailureStatuses },
      webPush: { attempted: webTargets?.length ?? 0, sent: webSent, failed: webFailureStatuses.length, failureStatuses: webFailureStatuses },
    });
  } catch (error) {
    console.error('send-emergency-push failed', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'PUSH_DISPATCH_FAILED' }, 500);
  }
});

