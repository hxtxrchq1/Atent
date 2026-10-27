import { createClient } from 'jsr:@supabase/supabase-js@2';

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
    const record = payload.record ?? payload;
    if (payload.type && payload.type !== 'INSERT') return json({ ignored: true });
    if (!record.id || !record.owner_user_id || record.status !== 'active') return json({ ignored: true });

    const { data: relationships, error: relationError } = await supabase
      .from('trusted_contacts')
      .select('user_id, trusted_user_id')
      .or(`user_id.eq.${record.owner_user_id},trusted_user_id.eq.${record.owner_user_id}`);
    if (relationError) throw relationError;

    const recipientIds = [...new Set((relationships ?? []).map((row) =>
      row.user_id === record.owner_user_id ? row.trusted_user_id : row.user_id,
    ))];
    if (recipientIds.length === 0) return json({ sent: 0, reason: 'NO_TRUSTED_CONTACTS' });

    const { data: devices, error: deviceError } = await supabase
      .from('device_status')
      .select('user_id, push_token')
      .in('user_id', recipientIds)
      .not('push_token', 'is', null);
    if (deviceError) throw deviceError;

    const serviceAccount = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON')!);
    const accessToken = await googleAccessToken(serviceAccount);
    let sent = 0;
    for (const device of devices ?? []) {
      if (!device.push_token) continue;
      const response = await fetch(`https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`, {
        method: 'POST',
        headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ message: {
          token: device.push_token,
          notification: { title: '🚨 ALERTA ATENT', body: 'Tu contacto de confianza necesita auxilio inmediato' },
          data: { alertId: String(record.id), ownerName: 'Tu contacto de confianza' },
          android: { priority: 'HIGH', notification: { channel_id: 'atent_incoming_alerts', sound: 'default' } },
        } }),
      });
      if (response.ok) sent += 1;
    }
    return json({ sent });
  } catch (error) {
    console.error('send-emergency-push failed', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'PUSH_DISPATCH_FAILED' }, 500);
  }
});
