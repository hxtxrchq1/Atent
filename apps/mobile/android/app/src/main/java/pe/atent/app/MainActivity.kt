package pe.atent.app

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.location.Location
import android.location.LocationManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.ContactsContract
import android.provider.Settings
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationServices
import pe.atent.app.services.EmergencyForegroundService
import pe.atent.app.services.IncomingEmergencyAlertService
import pe.atent.app.services.TrustedAlertPollingService
import org.json.JSONObject

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    // Activity Result Launcher for Native Android Contact Picker Intent
    private val pickContactLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val contactUri: Uri? = result.data?.data
            if (contactUri != null) {
                resolveContactDetails(contactUri)
            }
        }
    }

    // Permission request launcher
    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val grantedMap = JSONObject()
        permissions.entries.forEach { (perm, isGranted) ->
            grantedMap.put(perm, isGranted)
        }
        runOnUiThread {
            webView.evaluateJavascript(
                "window.onAndroidPermissionsResult && window.onAndroidPermissionsResult(${grantedMap});",
                null
            )
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        setTheme(R.style.AppTheme)
        super.onCreate(savedInstanceState)

        window.apply {
            addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS)
            statusBarColor = Color.parseColor("#09080D")
            navigationBarColor = Color.parseColor("#09080D")
            decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        }

        webView = WebView(this).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(Color.parseColor("#09080D"))

            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                allowFileAccess = true
                allowContentAccess = true
                useWideViewPort = true
                loadWithOverviewMode = true
                cacheMode = WebSettings.LOAD_DEFAULT
                setGeolocationEnabled(true)

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
                    allowFileAccessFromFileURLs = true
                    allowUniversalAccessFromFileURLs = true
                }
            }

            webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    view?.setBackgroundColor(Color.parseColor("#09080D"))
                }

                override fun shouldOverrideUrlLoading(view: WebView?, request: android.webkit.WebResourceRequest?): Boolean {
                    val uri = request?.url ?: return false
                    val urlStr = uri.toString()

                    // Handle internal app assets within WebView
                    if (urlStr.startsWith("file:///android_asset/")) {
                        return false
                    }

                    // Handle geo:, maps:, intent:, or external web URLs (Google Maps, etc.)
                    return try {
                        if (urlStr.startsWith("intent:")) {
                            val intent = Intent.parseUri(urlStr, Intent.URI_INTENT_SCHEME)
                            if (intent != null) {
                                val packageManager = packageManager
                                val info = packageManager.resolveActivity(intent, PackageManager.MATCH_DEFAULT_ONLY)
                                if (info != null) {
                                    startActivity(intent)
                                } else {
                                    val fallbackUrl = intent.getStringExtra("browser_fallback_url")
                                    if (fallbackUrl != null) {
                                        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(fallbackUrl)))
                                    }
                                }
                                true
                            } else {
                                false
                            }
                        } else {
                            val intent = Intent(Intent.ACTION_VIEW, uri)
                            startActivity(intent)
                            true
                        }
                    } catch (e: Exception) {
                        e.printStackTrace()
                        false
                    }
                }
            }

            webChromeClient = object : WebChromeClient() {
                override fun onGeolocationPermissionsShowPrompt(
                    origin: String?,
                    callback: android.webkit.GeolocationPermissions.Callback?
                ) {
                    callback?.invoke(origin, true, false)
                }

                override fun onJsConfirm(
                    view: WebView?,
                    url: String?,
                    message: String?,
                    result: android.webkit.JsResult?
                ): Boolean {
                    // Prevenir cuadro feo "La página file:/// dice:" y mostrar AlertDialog estilizado de Android
                    androidx.appcompat.app.AlertDialog.Builder(this@MainActivity)
                        .setTitle("Confirmar")
                        .setMessage(message)
                        .setPositiveButton("Aceptar") { _, _ -> result?.confirm() }
                        .setNegativeButton("Cancelar") { _, _ -> result?.cancel() }
                        .setOnCancelListener { result?.cancel() }
                        .show()
                    return true
                }

                override fun onJsAlert(
                    view: WebView?,
                    url: String?,
                    message: String?,
                    result: android.webkit.JsResult?
                ): Boolean {
                    androidx.appcompat.app.AlertDialog.Builder(this@MainActivity)
                        .setTitle("Atent")
                        .setMessage(message)
                        .setPositiveButton("Entendido") { _, _ -> result?.confirm() }
                        .setOnCancelListener { result?.cancel() }
                        .show()
                    return true
                }
            }

            // Connect JavaScript Bridge
            addJavascriptInterface(AndroidNativeBridge(), "AndroidBridge")
        }

        setContentView(webView)
        webView.loadUrl("file:///android_asset/www/index.html")
    }

    private fun resolveContactDetails(contactUri: Uri) {
        var name = ""
        var phoneNumber = ""

        try {
            contentResolver.query(contactUri, null, null, null, null)?.use { cursor ->
                if (cursor.moveToFirst()) {
                    val idIndex = cursor.getColumnIndex(ContactsContract.Contacts._ID)
                    val nameIndex = cursor.getColumnIndex(ContactsContract.Contacts.DISPLAY_NAME)
                    val hasPhoneIndex = cursor.getColumnIndex(ContactsContract.Contacts.HAS_PHONE_NUMBER)

                    if (nameIndex != -1) {
                        name = cursor.getString(nameIndex) ?: ""
                    }

                    val contactId = if (idIndex != -1) cursor.getString(idIndex) else null
                    val hasPhone = if (hasPhoneIndex != -1) cursor.getInt(hasPhoneIndex) else 0

                    if (hasPhone > 0 && contactId != null) {
                        contentResolver.query(
                            ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                            null,
                            "${ContactsContract.CommonDataKinds.Phone.CONTACT_ID} = ?",
                            arrayOf(contactId),
                            null
                        )?.use { phoneCursor ->
                            if (phoneCursor.moveToFirst()) {
                                val phoneIdx = phoneCursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER)
                                if (phoneIdx != -1) {
                                    phoneNumber = phoneCursor.getString(phoneIdx) ?: ""
                                }
                            }
                        }
                    }
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        val safeName = JSONObject.quote(name)
        val safePhone = JSONObject.quote(phoneNumber)
        runOnUiThread {
            webView.evaluateJavascript(
                "window.onAndroidContactPicked && window.onAndroidContactPicked(${safeName}, ${safePhone});",
                null
            )
        }
    }

    override fun onResume() {
        super.onResume()
        stopIncomingEmergencyAlert()
        if (this::webView.isInitialized) {
            webView.evaluateJavascript("window.onAndroidAppResumed && window.onAndroidAppResumed();", null)
        }
    }

    override fun onBackPressed() {
        if (this::webView.isInitialized && webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        if (this::webView.isInitialized) {
            webView.destroy()
        }
        super.onDestroy()
    }

    inner class AndroidNativeBridge {

        @JavascriptInterface
        fun showIncomingEmergencyAlert(ownerName: String) {
            runOnUiThread {
                val alertIntent = Intent(this@MainActivity, IncomingEmergencyAlertService::class.java).apply {
                    action = IncomingEmergencyAlertService.ACTION_START
                    putExtra("ownerName", ownerName)
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startForegroundService(alertIntent)
                } else {
                    startService(alertIntent)
                }
            }
        }

        @JavascriptInterface
        fun stopIncomingEmergencyAlert() = this@MainActivity.stopIncomingEmergencyAlert()

        @JavascriptInterface
        fun configureTrustedAlertReceiver(userId: String) {
            if (userId.isBlank()) return
            val intent = Intent(this@MainActivity, TrustedAlertPollingService::class.java).apply {
                action = TrustedAlertPollingService.ACTION_CONFIGURE
                putExtra("user_id", userId)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) startForegroundService(intent) else startService(intent)
        }

        @JavascriptInterface
        fun stopTrustedAlertReceiver() {
            startService(Intent(this@MainActivity, TrustedAlertPollingService::class.java).apply {
                action = TrustedAlertPollingService.ACTION_STOP
            })
        }

        @JavascriptInterface
        fun pickPhoneContact() {
            runOnUiThread {
                val intent = Intent(Intent.ACTION_PICK, ContactsContract.Contacts.CONTENT_URI)
                pickContactLauncher.launch(intent)
            }
        }

        @JavascriptInterface
        fun requestAppPermissions() {
            runOnUiThread {
                val perms = mutableListOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION,
                    Manifest.permission.READ_CONTACTS
                )
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    perms.add(Manifest.permission.POST_NOTIFICATIONS)
                }
                requestPermissionLauncher.launch(perms.toTypedArray())
            }
        }

        @JavascriptInterface
        fun requestBackgroundLocationPermission() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q &&
                ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.ACCESS_BACKGROUND_LOCATION) != PackageManager.PERMISSION_GRANTED) {
                requestPermissionLauncher.launch(arrayOf(Manifest.permission.ACCESS_BACKGROUND_LOCATION))
            }
        }

        @JavascriptInterface
        fun checkPermissionsStatus(): String {
            val res = JSONObject()
            val fineLoc = ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            val contacts = ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.READ_CONTACTS) == PackageManager.PERMISSION_GRANTED
            val notifs = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
            } else true
            val backgroundLocation = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.ACCESS_BACKGROUND_LOCATION) == PackageManager.PERMISSION_GRANTED
            } else true

            res.put("location", fineLoc)
            res.put("contacts", contacts)
            res.put("notifications", notifs)
            res.put("backgroundLocation", backgroundLocation)
            res.put("notificationPolicyAccess", isNotificationPolicyAccessGranted())
            return res.toString()
        }

        @JavascriptInterface
        fun openAppSettings() {
            runOnUiThread {
                val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.fromParts("package", packageName, null)
                }
                startActivity(intent)
            }
        }

        @JavascriptInterface
        fun openExternalUrl(url: String) {
            val uri = try { Uri.parse(url) } catch (_: Exception) { return }
            val isGithubRelease = uri.scheme == "https" &&
                uri.host == "github.com" &&
                uri.path?.startsWith("/hxtxrchq/Atent/releases/") == true
            val isSupabaseRelease = uri.scheme == "https" &&
                uri.host == "gxkpiqmuhvpsbmooieod.supabase.co" &&
                uri.path == "/storage/v1/object/public/app-releases/AtentV1.apk"
            if (!isGithubRelease && !isSupabaseRelease) return
            runOnUiThread {
                startActivity(Intent(Intent.ACTION_VIEW, uri))
            }
        }

        @JavascriptInterface
        fun openNotificationPolicySettings() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                startActivity(Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS))
            }
        }

        @JavascriptInterface
        fun isNotificationPolicyAccessGranted(): Boolean {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            return manager.isNotificationPolicyAccessGranted
        }

        @JavascriptInterface
        fun openLocationSettings() {
            runOnUiThread {
                try {
                    val intent = Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS)
                    startActivity(intent)
                } catch (e: Exception) {
                    val intent = Intent(Settings.ACTION_SETTINGS)
                    startActivity(intent)
                }
            }
        }

        @JavascriptInterface
        fun openExternalMap(latitude: Double, longitude: Double) {
            runOnUiThread {
                try {
                    // Try launching Google Maps app specifically with geo URI
                    val gmmIntentUri = Uri.parse("geo:$latitude,$longitude?q=$latitude,$longitude(Tu+Ubicación)")
                    val mapIntent = Intent(Intent.ACTION_VIEW, gmmIntentUri)
                    mapIntent.setPackage("com.google.android.apps.maps")

                    val packageManager = packageManager
                    if (mapIntent.resolveActivity(packageManager) != null) {
                        startActivity(mapIntent)
                    } else {
                        // Fallback to browser with standard Google Maps URL
                        val webIntent = Intent(
                            Intent.ACTION_VIEW,
                            Uri.parse("https://www.google.com/maps/search/?api=1&query=$latitude,$longitude")
                        )
                        startActivity(webIntent)
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                    try {
                        val webIntent = Intent(
                            Intent.ACTION_VIEW,
                            Uri.parse("https://www.google.com/maps/search/?api=1&query=$latitude,$longitude")
                        )
                        startActivity(webIntent)
                    } catch (ex: Exception) {
                        ex.printStackTrace()
                    }
                }
            }
        }

        @JavascriptInterface
        fun getRealLocation(requestId: String?) {
            runOnUiThread {
                try {
                    val locationManager = getSystemService(Context.LOCATION_SERVICE) as? LocationManager
                    val isGpsOn = locationManager?.isProviderEnabled(LocationManager.GPS_PROVIDER) == true ||
                                  locationManager?.isProviderEnabled(LocationManager.NETWORK_PROVIDER) == true

                    if (!isGpsOn) {
                        webView.evaluateJavascript("window.onAndroidLocationError && window.onAndroidLocationError('GPS_DISABLED');", null)
                        return@runOnUiThread
                    }

                    val hasFine = ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                    val hasCoarse = ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

                    if (!hasFine && !hasCoarse) {
                        // Request permissions directly if not granted
                        requestAppPermissions()
                        webView.evaluateJavascript("window.onAndroidLocationError && window.onAndroidLocationError('PERMISSION_DENIED');", null)
                        return@runOnUiThread
                    }

                    val fusedLocationClient = LocationServices.getFusedLocationProviderClient(this@MainActivity)

                    // No usar lastLocation para una actualización manual: es una caché del
                    // sistema y puede tener minutos de antigüedad. maxUpdateAgeMillis=0
                    // obliga a Google Play Services a solicitar una lectura actual.
                    val cancellationTokenSource = com.google.android.gms.tasks.CancellationTokenSource()
                    val currentRequest = com.google.android.gms.location.CurrentLocationRequest.Builder()
                        .setPriority(com.google.android.gms.location.Priority.PRIORITY_HIGH_ACCURACY)
                        .setMaxUpdateAgeMillis(0L)
                        .setDurationMillis(15000L)
                        .build()
                    fusedLocationClient.getCurrentLocation(currentRequest, cancellationTokenSource.token)
                        .addOnSuccessListener { freshLoc: Location? ->
                            if (freshLoc != null) {
                                // Location.time identifica el fix GNSS y puede permanecer igual
                                // si el usuario sigue quieto. La UI necesita distinguir cada
                                // lectura solicitada, así que usamos la hora de entrega al WebView.
                                val freshJson = JSONObject().apply {
                                    put("latitude", freshLoc.latitude)
                                    put("longitude", freshLoc.longitude)
                                    put("accuracy", freshLoc.accuracy.toDouble())
                                    // La hora representa esta solicitud concreta, no la cachÃ© de Location.
                                    put("timestamp", System.currentTimeMillis())
                                    if (!requestId.isNullOrBlank()) put("requestId", requestId)
                                }
                                webView.evaluateJavascript("window.onAndroidLocationReceived && window.onAndroidLocationReceived(${freshJson});", null)
                            } else {
                                webView.evaluateJavascript("window.onAndroidLocationError && window.onAndroidLocationError('LOCATION_UNAVAILABLE');", null)
                            }
                        }.addOnFailureListener { err ->
                        webView.evaluateJavascript("window.onAndroidLocationError && window.onAndroidLocationError('${err.message}');", null)
                    }
                } catch (e: Exception) {
                    webView.evaluateJavascript("window.onAndroidLocationError && window.onAndroidLocationError('${e.message}');", null)
                }
            }
        }

        @JavascriptInterface
        fun isGpsEnabled(): Boolean {
            val locationManager = getSystemService(Context.LOCATION_SERVICE) as? LocationManager
            return locationManager?.isProviderEnabled(LocationManager.GPS_PROVIDER) == true ||
                   locationManager?.isProviderEnabled(LocationManager.NETWORK_PROVIDER) == true
        }

        @JavascriptInterface
        fun startEmergencyForegroundService() {
            val serviceIntent = Intent(this@MainActivity, EmergencyForegroundService::class.java).apply {
                action = EmergencyForegroundService.ACTION_START
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent)
            } else {
                startService(serviceIntent)
            }
        }

        @JavascriptInterface
        fun stopEmergencyForegroundService() {
            val serviceIntent = Intent(this@MainActivity, EmergencyForegroundService::class.java).apply {
                action = EmergencyForegroundService.ACTION_STOP
            }
            startService(serviceIntent)
        }

        @JavascriptInterface
        fun getBatteryStatus(): String {
            val bm = getSystemService(Context.BATTERY_SERVICE) as? android.os.BatteryManager
            val res = JSONObject()
            if (bm != null) {
                val level = bm.getIntProperty(android.os.BatteryManager.BATTERY_PROPERTY_CAPACITY)
                val status = bm.getIntProperty(android.os.BatteryManager.BATTERY_PROPERTY_STATUS)
                val isCharging = status == android.os.BatteryManager.BATTERY_STATUS_CHARGING ||
                                 status == android.os.BatteryManager.BATTERY_STATUS_FULL
                res.put("level", level)
                res.put("isCharging", isCharging)
                res.put("timestamp", System.currentTimeMillis())
            } else {
                res.put("level", -1)
                res.put("isCharging", false)
                res.put("timestamp", System.currentTimeMillis())
            }
            return res.toString()
        }

        @JavascriptInterface
        fun getAppVersion(): String = BuildConfig.VERSION_NAME
    }

    private fun stopIncomingEmergencyAlert() {
        val intent = Intent(this, IncomingEmergencyAlertService::class.java).apply {
            action = IncomingEmergencyAlertService.ACTION_STOP
        }
        startService(intent)
    }
}
