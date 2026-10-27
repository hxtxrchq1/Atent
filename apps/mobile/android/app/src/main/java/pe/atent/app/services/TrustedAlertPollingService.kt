package pe.atent.app.services

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import org.json.JSONArray
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.io.OutputStreamWriter

/**
 * Receptor mínimo de respaldo. El sondeo ocurre fuera del WebView, por lo que
 * cerrar la pantalla desde "cerrar todo" no elimina el listener de alertas.
 * Android todavía puede detenerlo tras Forzar detención o por políticas OEM.
 */
class TrustedAlertPollingService : Service() {
    companion object {
        const val ACTION_CONFIGURE = "ACTION_CONFIGURE_TRUSTED_ALERTS"
        const val ACTION_STOP = "ACTION_STOP_TRUSTED_ALERTS"
        private const val CHANNEL_ID = "atent_background_alerts"
        private const val NOTIFICATION_ID = 1912
        private const val PREFS = "trusted_alert_receiver"
        private const val USER_ID = "user_id"
        private const val LAST_ALERT = "last_alert_id"
        private const val SUPABASE_URL = "https://gxkpiqmuhvpsbmooieod.supabase.co"
        private const val SUPABASE_KEY = "sb_publishable_3CR_6m7aMGMjDWH_6C_o8g_kOCqNAxv"

        fun registerPushToken(context: Context, token: String) {
            val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            prefs.edit().putString("push_token", token).apply()
            val userId = prefs.getString(USER_ID, null) ?: return
            Thread {
                try {
                    val connection = (URL("$SUPABASE_URL/rest/v1/device_status").openConnection() as HttpURLConnection).apply {
                        requestMethod = "POST"
                        doOutput = true
                        setRequestProperty("apikey", SUPABASE_KEY)
                        setRequestProperty("Authorization", "Bearer $SUPABASE_KEY")
                        setRequestProperty("Content-Type", "application/json")
                        setRequestProperty("Prefer", "resolution=merge-duplicates")
                    }
                    OutputStreamWriter(connection.outputStream).use {
                        it.write("{\"user_id\":\"$userId\",\"push_token\":\"$token\",\"last_seen_at\":\"${java.time.Instant.now()}\"}")
                    }
                    connection.inputStream.close()
                    connection.disconnect()
                } catch (_: Exception) { }
            }.start()
        }
    }

    private val executor = Executors.newSingleThreadScheduledExecutor()
    @Volatile private var pollingStarted = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createChannel()
        startForeground(NOTIFICATION_ID, buildNotification())
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            getSharedPreferences(PREFS, MODE_PRIVATE).edit().clear().apply()
            stopSelf()
            return START_NOT_STICKY
        }
        intent?.getStringExtra(USER_ID)?.takeIf { it.isNotBlank() }?.let {
            getSharedPreferences(PREFS, MODE_PRIVATE).edit().putString(USER_ID, it).apply()
            getSharedPreferences(PREFS, MODE_PRIVATE).getString("push_token", null)?.let { token -> registerPushToken(this, token) }
        }
        if (executor.isShutdown) return START_STICKY
        if (!pollingStarted) {
            pollingStarted = true
            executor.scheduleWithFixedDelay({ poll() }, 0, 5, TimeUnit.SECONDS)
        }
        return START_STICKY
    }

    private fun poll() {
        val userId = getSharedPreferences(PREFS, MODE_PRIVATE).getString(USER_ID, null) ?: return
        try {
            val connection = (URL("$SUPABASE_URL/rest/v1/rpc/get_trusted_alerts").openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                doOutput = true
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("apikey", SUPABASE_KEY)
                setRequestProperty("Authorization", "Bearer $SUPABASE_KEY")
                connectTimeout = 4000
                readTimeout = 4000
            }
            connection.outputStream.bufferedWriter().use { it.write("{\"p_viewer_user_id\":\"$userId\"}") }
            if (connection.responseCode !in 200..299) return
            val body = connection.inputStream.bufferedReader().use { it.readText() }
            val alerts = JSONArray(body)
            val lastId = getSharedPreferences(PREFS, MODE_PRIVATE).getString(LAST_ALERT, null)
            for (index in 0 until alerts.length()) {
                val alert = alerts.getJSONObject(index)
                if (alert.optString("status") != "active") continue
                val id = alert.optString("id")
                if (id.isBlank() || id == lastId) continue
                getSharedPreferences(PREFS, MODE_PRIVATE).edit().putString(LAST_ALERT, id).apply()
                val owner = alert.optString("owner_name", "Tu contacto de confianza")
                val alertIntent = Intent(this, IncomingEmergencyAlertService::class.java).apply {
                    action = IncomingEmergencyAlertService.ACTION_START
                    putExtra("ownerName", owner)
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) startForegroundService(alertIntent) else startService(alertIntent)
                break
            }
        } catch (_: Exception) {
            // La siguiente iteración reintenta; no se registran PII ni coordenadas.
        }
    }

    private fun buildNotification(): Notification = NotificationCompat.Builder(this, CHANNEL_ID)
        .setSmallIcon(android.R.drawable.ic_dialog_info)
        .setContentTitle("Atent está protegiendo tus alertas")
        .setContentText("Recepción de alertas de tu red de confianza activa")
        .setPriority(NotificationCompat.PRIORITY_MIN)
        .setOngoing(true)
        .build()

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(NotificationChannel(CHANNEL_ID, "Protección de alertas", NotificationManager.IMPORTANCE_MIN))
        }
    }

    override fun onDestroy() {
        executor.shutdownNow()
        super.onDestroy()
    }
}
