import { readFileSync } from 'node:fs';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import type { NotificationAdapter } from '@atent/shared';

export class FirebaseAdminPushAdapter implements NotificationAdapter {
  public readonly name = 'FirebaseAdminFCM';
  private readonly messaging: ReturnType<typeof getMessaging> | null;

  constructor(serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '.secrets/firebase-service-account.json') {
    try {
      const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
      const app = getApps()[0] ?? initializeApp({ credential: cert(serviceAccount) });
      this.messaging = getMessaging(app);
    } catch {
      this.messaging = null;
    }
  }

  async sendEmergencySms() {
    return { success: false, providerId: 'UNSUPPORTED' };
  }

  async sendEmergencyPush(deviceToken: string, title: string, body: string, data: Record<string, string>) {
    if (!this.messaging) return { success: false, messageId: '', error: 'FCM_NOT_CONFIGURED' };
    try {
      const messageId = await this.messaging.send({
        token: deviceToken,
        notification: { title, body },
        data,
        android: { priority: 'high', notification: { channelId: 'atent_incoming_alerts', sound: 'default' } },
      });
      return { success: true, messageId };
    } catch (error) {
      return { success: false, messageId: '', error: error instanceof Error ? error.message : 'FCM_SEND_FAILED' };
    }
  }
}
