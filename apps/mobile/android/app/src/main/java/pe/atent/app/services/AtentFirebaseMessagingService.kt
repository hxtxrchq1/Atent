package pe.atent.app.services

import android.content.Context
import android.content.Intent
import android.os.Build
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

/** Receives FCM while the Activity/WebView is closed or not running. */
class AtentFirebaseMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        TrustedAlertPollingService.registerPushToken(applicationContext, token)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val data = message.data
        val ownerName = data["ownerName"] ?: message.notification?.title ?: "Tu contacto de confianza"
        val alertType = data["alertType"] ?: "SOS"
        val alertId = data["alertId"] ?: ""
        if (alertType == "DIRECT") {
            DirectTrustedAlertNotification.show(this, ownerName, alertId)
            return
        }
        val alertIntent = Intent(this, IncomingEmergencyAlertService::class.java).apply {
            action = IncomingEmergencyAlertService.ACTION_START
            putExtra("ownerName", ownerName)
            putExtra("alertId", alertId)
            putExtra("alertType", "SOS")
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) startForegroundService(alertIntent) else startService(alertIntent)
    }
}
