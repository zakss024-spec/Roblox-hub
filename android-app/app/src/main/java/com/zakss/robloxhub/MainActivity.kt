package com.zakss.robloxhub

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private lateinit var progress: ProgressBar
    private lateinit var offlinePanel: LinearLayout
    private lateinit var splashPanel: LinearLayout

    private val homeUrl = "https://roblox-hub-project-of-zakss.vercel.app/"
    private val allowedHost = "roblox-hub-project-of-zakss.vercel.app"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.rgb(16, 20, 13)
        window.navigationBarColor = Color.rgb(16, 20, 13)
        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)
        enterImmersiveMode()

        val root = FrameLayout(this).apply { setBackgroundColor(Color.rgb(16, 20, 13)) }
        webView = WebView(this).apply {
            setBackgroundColor(Color.rgb(244, 240, 230))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            settings.loadsImagesAutomatically = true
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            settings.cacheMode = WebSettings.LOAD_DEFAULT
            settings.javaScriptCanOpenWindowsAutomatically = true
            settings.setSupportMultipleWindows(false)
            settings.mediaPlaybackRequiresUserGesture = true
            settings.userAgentString = settings.userAgentString + " ROBLOXHUB-Android/1.0"
            WebView.setWebContentsDebuggingEnabled(false)
        }

        progress = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            max = 100
            progressDrawable.setColorFilter(Color.rgb(168, 240, 74), android.graphics.PorterDuff.Mode.SRC_IN)
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, dp(3), Gravity.TOP
            )
        }

        splashPanel = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(dp(24), dp(24), dp(24), dp(24))
            setBackgroundColor(Color.rgb(16, 20, 13))
            addView(TextView(this@MainActivity).apply {
                text = "ROBLOX HUB"
                setTextColor(Color.rgb(168, 240, 74))
                textSize = 30f
                gravity = Gravity.CENTER
                typeface = android.graphics.Typeface.create("sans-serif-black", android.graphics.Typeface.NORMAL)
            })
            addView(TextView(this@MainActivity).apply {
                text = "YOUR NEXT EXPERIENCE STARTS HERE"
                setTextColor(Color.WHITE)
                textSize = 11f
                letterSpacing = 0.16f
                gravity = Gravity.CENTER
                setPadding(0, dp(8), 0, dp(22))
            })
            addView(ProgressBar(this@MainActivity).apply {
                indeterminateTintList = android.content.res.ColorStateList.valueOf(Color.rgb(168, 240, 74))
            })
        }

        offlinePanel = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(dp(28), dp(28), dp(28), dp(28))
            setBackgroundColor(Color.rgb(16, 20, 13))
            visibility = View.GONE
            addView(TextView(this@MainActivity).apply {
                text = "CONNECTION LOST"
                setTextColor(Color.rgb(168, 240, 74))
                textSize = 22f
                gravity = Gravity.CENTER
                typeface = android.graphics.Typeface.DEFAULT_BOLD
            })
            addView(TextView(this@MainActivity).apply {
                text = "ROBLOX HUB membutuhkan koneksi internet. Periksa jaringanmu lalu coba lagi."
                setTextColor(Color.WHITE)
                textSize = 15f
                gravity = Gravity.CENTER
                setPadding(0, dp(12), 0, dp(20))
            })
            addView(Button(this@MainActivity).apply {
                text = "COBA LAGI"
                setTextColor(Color.rgb(16, 20, 13))
                setBackgroundColor(Color.rgb(168, 240, 74))
                setOnClickListener { loadHome() }
            })
        }

        root.addView(webView, FrameLayout.LayoutParams(-1, -1))
        root.addView(splashPanel, FrameLayout.LayoutParams(-1, -1))
        root.addView(progress)
        root.addView(offlinePanel, FrameLayout.LayoutParams(-1, -1))
        setContentView(root)

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                progress.progress = newProgress
                progress.visibility = if (newProgress >= 100) View.GONE else View.VISIBLE
            }
        }
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val uri = request.url
                val scheme = uri.scheme ?: return true
                if (scheme == "https" && uri.host == allowedHost) return false
                if (scheme == "https" || scheme == "http") {
                    return try {
                        startActivity(Intent(Intent.ACTION_VIEW, uri))
                        true
                    } catch (_: Exception) {
                        true
                    }
                }
                return try {
                    startActivity(Intent(Intent.ACTION_VIEW, uri))
                    true
                } catch (_: Exception) {
                    true
                }
            }

            override fun onReceivedError(
                view: WebView,
                request: WebResourceRequest,
                error: WebResourceError
            ) {
                if (request.isForMainFrame) {
                    splashPanel.visibility = View.GONE
                    offlinePanel.visibility = View.VISIBLE
                    webView.visibility = View.GONE
                    progress.visibility = View.GONE
                }
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                splashPanel.visibility = View.GONE
                offlinePanel.visibility = View.GONE
                webView.visibility = View.VISIBLE
            }
        }

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState)
        } else {
            loadHome()
        }
    }

    private fun loadHome() {
        if (!isOnline()) {
            splashPanel.visibility = View.GONE
            offlinePanel.visibility = View.VISIBLE
            webView.visibility = View.GONE
            return
        }
        offlinePanel.visibility = View.GONE
        splashPanel.visibility = View.VISIBLE
        webView.visibility = View.VISIBLE
        webView.loadUrl(homeUrl)
    }

    private fun isOnline(): Boolean {
        val manager = getSystemService(CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = manager.activeNetwork ?: return false
        val capabilities = manager.getNetworkCapabilities(network) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    private fun enterImmersiveMode() {
        @Suppress("DEPRECATION")
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            )
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) enterImmersiveMode()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        webView.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    @Deprecated("Deprecated in Android")
    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }

    override fun onDestroy() {
        if (::webView.isInitialized) {
            webView.stopLoading()
            webView.destroy()
        }
        super.onDestroy()
    }
}
