package pe.atent.app.services

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import pe.atent.app.MainActivity

class EmergencyForegroundService : Service() {

    companion object {
        const val CHANNEL_ID = "atent_emergency_channel"
        const val NOTIFICATION_ID = 911
        const val ACTION_START = "ACTION_START_EMERGENCY"
        const val ACTION_STOP = "ACTION_STOP_EMERGENCY"
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> startForegroundEmergency()
            ACTION_STOP -> stopForegroundEmergency()
        }
        return START_STICKY
    }

    private fun startForegroundEmergency() {
        val notificationIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            notificationIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("🚨 ATENT: Alerta de Emergencia Activa")
            .setContentText("Transmitiendo ubicación en vivo a tus contactos seguros...")
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .build()

        startForeground(NOTIFICATION_ID, notification)
    }

    private fun stopForegroundEmergency() {
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Atent Emergency Tracking Channel",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Canal de alta prioridad para monitoreo en vivo durante emergencias"
                enableVibration(true)
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }
}
