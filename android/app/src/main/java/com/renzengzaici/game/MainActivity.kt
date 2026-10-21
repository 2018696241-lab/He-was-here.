package com.renzengzaici.game

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.graphics.Color
import android.os.Bundle
import android.webkit.*
import android.widget.FrameLayout
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.WebViewAssetLoader
import java.io.ByteArrayInputStream

class MainActivity : ComponentActivity() {
    private lateinit var web: WebView
    private lateinit var container: FrameLayout
    private var loaded = false
    private val origin = "https://appassets.androidplatform.net"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        container = FrameLayout(this).apply { setBackgroundColor(Color.rgb(238, 243, 246)) }
        setContentView(container)
        ViewCompat.setOnApplyWindowInsetsListener(container) { view, insets ->
            val safe = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout() or WindowInsetsCompat.Type.ime())
            view.setPadding(safe.left, safe.top, safe.right, safe.bottom)
            insets
        }
        createWebView()
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (!loaded) { confirmExit(); return }
                web.evaluateJavascript("Boolean(window.RenZengPlatform && RenZengPlatform.back())") { handled ->
                    if (handled != "true") confirmExit()
                }
            }
        })
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun createWebView() {
        loaded = false
        val engine = WebView.getCurrentWebViewPackage()?.versionName?.substringBefore('.')?.toIntOrNull() ?: 0
        if (engine < 105) {
            showFailure("系统网页组件版本过旧。请先在系统应用商店更新 Android System WebView 或 Chrome（105 或更新版本），再点击重试。游戏本身无需联网。")
            return
        }
        web = WebView(this)
        web.setBackgroundColor(Color.rgb(238, 243, 246))
        container.addView(web, FrameLayout.LayoutParams(-1, -1))
        val loader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this)).build()
        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            setSupportMultipleWindows(false)
            javaScriptCanOpenWindowsAutomatically = false
            textZoom = (resources.configuration.fontScale * 100).toInt().coerceIn(85, 160)
            mediaPlaybackRequiresUserGesture = true
        }
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)
        web.webChromeClient = object : WebChromeClient() {
            override fun onJsConfirm(view: WebView?, url: String?, message: String?, result: JsResult): Boolean {
                AlertDialog.Builder(this@MainActivity).setMessage(message)
                    .setPositiveButton("确认") { _, _ -> result.confirm() }
                    .setNegativeButton("取消") { _, _ -> result.cancel() }
                    .setOnCancelListener { result.cancel() }.show()
                return true
            }
        }
        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse {
                return loader.shouldInterceptRequest(request.url)
                    ?: WebResourceResponse("text/plain", "UTF-8", 403, "Offline", emptyMap(), ByteArrayInputStream(ByteArray(0)))
            }
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean =
                request.url.scheme != "https" || request.url.host != "appassets.androidplatform.net"
            override fun onPageFinished(view: WebView, url: String) {
                view.evaluateJavascript("Boolean(window.RenZengPlatform && document.getElementById('rz-reader')?.childElementCount)") { ready ->
                    loaded = ready == "true"
                    if (!loaded) showFailure("游戏未能正常启动。请点击重试；若仍无法启动，请更新系统 WebView。")
                }
            }
            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                if (request.isForMainFrame) showFailure("游戏页面未能加载。点击重试。")
            }
            override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
                loaded = false
                container.removeView(view)
                view.destroy()
                showFailure("页面已被系统释放。点击恢复最近的存档。")
                return true
            }
        }
        web.loadUrl("$origin/assets/game/index.html")
    }
    private fun showFailure(message: String) {
        loaded = false
        val notice = TextView(this).apply {
            text = message; textSize = 20f
            setPadding(32, 80, 32, 32); setBackgroundColor(Color.WHITE)
            setOnClickListener {
                container.removeAllViews()
                if (::web.isInitialized) web.destroy()
                createWebView()
            }
        }
        container.addView(notice, FrameLayout.LayoutParams(-1, -1))
    }
    private fun confirmExit() {
        AlertDialog.Builder(this).setTitle("退出游戏？")
            .setMessage("调查进度会自动保存在本机。")
            .setNegativeButton("继续调查", null)
            .setPositiveButton("退出") { _, _ ->
                if (loaded) web.evaluateJavascript("window.RenZengPlatform?.save()") { saved ->
                    if (saved == "false") AlertDialog.Builder(this)
                        .setTitle("进度尚未成功保存")
                        .setMessage("请返回游戏处理存档提示，或确认放弃本次未保存的进度。")
                        .setNegativeButton("返回游戏", null)
                        .setPositiveButton("仍然退出") { _, _ -> finish() }.show()
                    else finish()
                }
                else finish()
            }.show()
    }
    override fun onPause() {
        if (loaded) web.evaluateJavascript("window.RenZengPlatform?.save()", null)
        super.onPause()
    }
    override fun onDestroy() {
        if (::web.isInitialized) {
            container.removeView(web)
            web.destroy()
        }
        super.onDestroy()
    }
}
