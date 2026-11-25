package pe.atent.app.services

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.os.Build
import android.net.Uri
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import pe.atent.app.MainActivity
import pe.atent.app.R

/** Short-lived, single-recipient notification; it does not start the SOS alarm service. */
object DirectTrustedAlertNotification {
    private const val CHANNEL_ID = "atent_direct_trusted_alerts_v2"

    private const val PREFS = "trusted_alert_receiver"
    private const val SHOWN_ALERT_IDS = "shown_direct_alert_ids"

    fun notificationId(alertId: String): Int =
        100000 + (alertId.hashCode() and 0x7fffffff) % 900000

    fun shownAlertIds(context: Context): Set<String> =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getStringSet(SHOWN_ALERT_IDS, emptySet())?.toSet() ?: emptySet()

    fun cancel(context: Context, alertId: String) {
        NotificationManagerCompat.from(context).cancel(notificationId(alertId))
    }

    fun show(context: Context, senderName: String, alertId: String) {
        if (alertId.isNotBlank()) {
            val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val shown = (prefs.getStringSet(SHOWN_ALERT_IDS, emptySet()) ?: emptySet()).toMutableSet()
            if (alertId in shown) return
            shown.add(alertId)
            while (shown.size > 100) shown.remove(shown.first())
            prefs.edit().putStringSet(SHOWN_ALERT_IDS, shown).apply()
        }
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (manager.getNotificationChannel(CHANNEL_ID) == null) {
                val sound = Uri.parse("android.resource://${context.packageName}/${R.raw.alert_sound}")
                val audioAttributes = AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
                val channel = NotificationChannel(CHANNEL_ID, "Alertas individuales de confianza", NotificationManager.IMPORTANCE_HIGH).apply {
                    description = "Notificaciones de ayuda enviadas a un solo contacto"
                    enableVibration(true)
                    vibrationPattern = longArrayOf(0, 500, 250, 500)
                    setSound(sound, audioAttributes)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && manager.isNotificationPolicyAccessGranted) {
                        setBypassDnd(true)
                    }
                }
                manager.createNotificationChannel(channel)
            }
        }
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("directAlertId", alertId)
        }
        val notificationId = notificationId(alertId)
        val pendingIntent = PendingIntent.getActivity(
            context, notificationId, intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle("Atent: $senderName te necesita")
            .setContentText("Te envió una alerta de ayuda individual.")
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVibrate(longArrayOf(0, 500, 250, 500))
            .setAutoCancel(true)
            .setOngoing(false)
            .setContentIntent(pendingIntent)
            .build()
        NotificationManagerCompat.from(context).notify(notificationId, notification)
    }
}
