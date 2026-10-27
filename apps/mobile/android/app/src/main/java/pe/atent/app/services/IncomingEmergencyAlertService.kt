package pe.atent.app.services

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.os.Build
import android.os.IBinder
import android.os.VibrationEffect
import android.os.Vibrator
import androidx.core.app.NotificationCompat
import pe.atent.app.MainActivity
import pe.atent.app.R

/**
 * Keeps the incoming emergency signal audible and vibrating until the user
 * opens Atent. It does not alter system volume or disable Do Not Disturb.
 */
class IncomingEmergencyAlertService : Service() {
    companion object {
        const val ACTION_START = "ACTION_START_INCOMING_ALERT"
        const val ACTION_STOP = "ACTION_STOP_INCOMING_ALERT"
        private const val CHANNEL_ID = "atent_incoming_alerts"
        private const val NOTIFICATION_ID = 1911
    }

    private var player: MediaPlayer? = null
    private var vibrator: Vibrator? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopAlert()
            return START_NOT_STICKY
        }

        val ownerName = intent?.getStringExtra("ownerName") ?: "Tu contacto de confianza"
        startForeground(NOTIFICATION_ID, buildNotification(ownerName))
        startAlertSound()
        return START_STICKY
    }

    private fun startAlertSound() {
        if (player == null) {
            player = MediaPlayer.create(this, R.raw.alert_sound)?.apply {
                isLooping = true
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
            }
        }
        player?.let { if (!it.isPlaying) it.start() }

        vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        vibrator?.let {
            val pattern = longArrayOf(0, 700, 350)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                it.vibrate(VibrationEffect.createWaveform(pattern, 0))
            } else {
                @Suppress("DEPRECATION")
                it.vibrate(pattern, 0)
            }
        }
    }

    private fun stopAlert() {
        player?.run { if (isPlaying) stop(); release() }
        player = null
        vibrator?.cancel()
        vibrator = null
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun buildNotification(ownerName: String): Notification {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this, NOTIFICATION_ID, intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle("Atent: $ownerName está en peligro")
            .setContentText("Abre Atent para ver la emergencia y detener la alerta")
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setOngoing(true)
            .setAutoCancel(false)
            .setContentIntent(pendingIntent)
            .build()
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Alertas de contactos de auxilio",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Señal persistente para emergencias de la red de confianza"
            enableVibration(true)
            setSound(null, null)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && manager.isNotificationPolicyAccessGranted) {
                setBypassDnd(true)
            }
        }
        manager.createNotificationChannel(channel)
    }

    override fun onDestroy() {
        stopAlert()
        super.onDestroy()
    }
}
