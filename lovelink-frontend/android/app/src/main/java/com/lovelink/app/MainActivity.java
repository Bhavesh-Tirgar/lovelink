package com.lovelink.app;

import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            // Request OS-level permissions for WebRTC Microphone and Camera
            String[] perms = {
                android.Manifest.permission.RECORD_AUDIO,
                android.Manifest.permission.CAMERA,
                android.Manifest.permission.MODIFY_AUDIO_SETTINGS
            };
            boolean needPerm = false;
            for (String p : perms) {
                if (androidx.core.content.ContextCompat.checkSelfPermission(this, p) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                    needPerm = true;
                    break;
                }
            }
            if (needPerm) {
                androidx.core.app.ActivityCompat.requestPermissions(this, perms, 101);
            }

            // Ensure Speakerphone is available for WebRTC calls
            android.media.AudioManager audioManager = (android.media.AudioManager) getSystemService(android.content.Context.AUDIO_SERVICE);
            if (audioManager != null) {
                audioManager.setMode(android.media.AudioManager.MODE_NORMAL);
                audioManager.setSpeakerphoneOn(true);
            }

            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView webView = getBridge().getWebView();
                CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);
                
                WebSettings settings = webView.getSettings();
                settings.setJavaScriptCanOpenWindowsAutomatically(true);
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setMediaPlaybackRequiresUserGesture(false);
                settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
                
                // Chrome Mobile user agent string to eliminate Google 'disallowed_useragent' errors
                settings.setUserAgentString("Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36");

                // Explicitly grant camera & microphone permissions to WebRTC calls
                webView.setWebChromeClient(new WebChromeClient() {
                    @Override
                    public void onPermissionRequest(final PermissionRequest request) {
                        runOnUiThread(() -> {
                            request.grant(request.getResources());
                        });
                    }
                });
            }
        } catch (Exception e) {
            android.util.Log.e("LoveLinkMainActivity", "Error configuring webview", e);
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        // Prevent background suspension of audio playback, WebSockets & timers
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView wv = getBridge().getWebView();
                wv.resumeTimers();
                wv.onResume();
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onStop() {
        super.onStop();
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView wv = getBridge().getWebView();
                wv.resumeTimers();
                wv.onResume();
            }
        } catch (Exception ignored) {}
    }
}
