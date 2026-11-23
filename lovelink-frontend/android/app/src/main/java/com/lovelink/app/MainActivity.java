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
            // Request OS-level permissions for Camera, Microphone, Audio, and Notifications (Android 13+)
            java.util.List<String> permList = new java.util.ArrayList<>();
            permList.add(android.Manifest.permission.RECORD_AUDIO);
            permList.add(android.Manifest.permission.CAMERA);
            permList.add(android.Manifest.permission.MODIFY_AUDIO_SETTINGS);
            if (android.os.Build.VERSION.SDK_INT >= 33) {
                permList.add("android.permission.POST_NOTIFICATIONS");
            }

            java.util.List<String> needPerms = new java.util.ArrayList<>();
            for (String p : permList) {
                if (androidx.core.content.ContextCompat.checkSelfPermission(this, p) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                    needPerms.add(p);
                }
            }
            if (!needPerms.isEmpty()) {
                androidx.core.app.ActivityCompat.requestPermissions(this, needPerms.toArray(new String[0]), 101);
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

                // Explicitly grant camera & microphone permissions to WebRTC calls only for trusted origins
                webView.setWebChromeClient(new WebChromeClient() {
                    @Override
                    public void onPermissionRequest(final PermissionRequest request) {
                        runOnUiThread(() -> {
                            if (request.getOrigin() != null) {
                                String origin = request.getOrigin().toString();
                                if (origin.startsWith("capacitor://") ||
                                    origin.startsWith("https://lovelink-pearl.vercel.app") ||
                                    origin.startsWith("https://lovelink.vercel.app") ||
                                    origin.startsWith("http://localhost")) {
                                    request.grant(request.getResources());
                                    return;
                                }
                            }
                            request.deny();
                        });
                    }
                });
            }
        } catch (Exception e) {
            android.util.Log.e("LoveLinkMainActivity", "Error configuring webview", e);
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView wv = getBridge().getWebView();
                wv.resumeTimers();
                wv.onResume();
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onPause() {
        super.onPause();
        // Allow audio timers to continue without fighting Android activity lifecycle
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView wv = getBridge().getWebView();
                wv.resumeTimers();
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onStop() {
        super.onStop();
        // Respect OS lifecycle onStop so LowMemoryKiller doesn't prioritize killing the app
    }
}
