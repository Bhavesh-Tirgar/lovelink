package com.lovelink.app;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import java.util.Arrays;
import java.util.List;

public class MainActivity extends BridgeActivity {
    private android.os.PowerManager.WakeLock wakeLock;
    private AudioManager audioManager;
    private AudioFocusRequest focusRequest;
    private boolean isMediaPlaying = false;

    private final AudioManager.OnAudioFocusChangeListener audioFocusChangeListener =
        focusChange -> {
            if (focusChange == AudioManager.AUDIOFOCUS_LOSS
                    || focusChange == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) {
                runOnUiThread(() -> {
                    if (getBridge() != null && getBridge().getWebView() != null) {
                        getBridge().getWebView().evaluateJavascript(
                            "window.dispatchEvent(new CustomEvent('lovelink:audiofocus_lost'));",
                            null
                        );
                    }
                });
            } else if (focusChange == AudioManager.AUDIOFOCUS_GAIN) {
                runOnUiThread(() -> {
                    if (getBridge() != null && getBridge().getWebView() != null) {
                        getBridge().getWebView().evaluateJavascript(
                            "window.dispatchEvent(new CustomEvent('lovelink:audiofocus_gain'));",
                            null
                        );
                    }
                });
            }
        };

    public class NativeAudioBridge {
        @JavascriptInterface
        public void setPlaybackState(boolean playing, String title, String artist) {
            isMediaPlaying = playing;
            runOnUiThread(() -> {
                try {
                    if (playing) {
                        requestPlaybackFocus();
                        Intent svc = new Intent(MainActivity.this, LoveLinkMediaService.class);
                        svc.setAction(LoveLinkMediaService.ACTION_START);
                        svc.putExtra(LoveLinkMediaService.EXTRA_TITLE, title != null ? title : "LoveLink Radio");
                        svc.putExtra(LoveLinkMediaService.EXTRA_ARTIST, artist != null ? artist : "Couple Sanctuary");
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            startForegroundService(svc);
                        } else {
                            startService(svc);
                        }
                    } else {
                        stopService(new Intent(MainActivity.this, LoveLinkMediaService.class));
                    }
                } catch (Exception e) {
                    android.util.Log.w("LoveLinkMainActivity", "MediaService transition error", e);
                }
            });
        }

        @JavascriptInterface
        @SuppressWarnings("deprecation")
        public void setCallAudioMode(boolean inCall, boolean speakerOn) {
            runOnUiThread(() -> {
                try {
                    if (audioManager == null) return;
                    if (inCall) {
                        audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
                        boolean hasExternalHeadset = audioManager.isWiredHeadsetOn() || audioManager.isBluetoothA2dpOn();
                        audioManager.setSpeakerphoneOn(speakerOn && !hasExternalHeadset);
                    } else {
                        audioManager.setSpeakerphoneOn(false);
                        audioManager.setMode(AudioManager.MODE_NORMAL);
                    }
                } catch (Exception ignored) {}
            });
        }
    }

    private void requestPlaybackFocus() {
        if (audioManager == null) return;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (focusRequest == null) {
                    AudioAttributes attrs = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build();
                    focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                        .setAudioAttributes(attrs)
                        .setOnAudioFocusChangeListener(audioFocusChangeListener)
                        .build();
                }
                audioManager.requestAudioFocus(focusRequest);
            } else {
                audioManager.requestAudioFocus(
                    audioFocusChangeListener,
                    AudioManager.STREAM_MUSIC,
                    AudioManager.AUDIOFOCUS_GAIN
                );
            }
        } catch (Exception ignored) {}
    }

    private boolean isTrustedOrigin(String origin) {
        if (origin == null || origin.isEmpty()) return false;
        try {
            Uri uri = Uri.parse(origin);
            String scheme = uri.getScheme();
            String host = uri.getHost();
            if ("capacitor".equalsIgnoreCase(scheme)) {
                return true;
            }
            if (host == null) return false;
            String lowerHost = host.toLowerCase();
            if ("http".equalsIgnoreCase(scheme) && ("localhost".equals(lowerHost) || "127.0.0.1".equals(lowerHost))) {
                return true;
            }
            if (!"https".equalsIgnoreCase(scheme)) {
                return false;
            }
            return "localhost".equals(lowerHost)
                || "127.0.0.1".equals(lowerHost)
                || "lovelink-pearl.vercel.app".equals(lowerHost)
                || "lovelink.vercel.app".equals(lowerHost)
                || (lowerHost.startsWith("lovelink") && lowerHost.endsWith(".vercel.app"));
        } catch (Exception ignored) {
            return false;
        }
    }

    private String sanitizeMediaAction(String action) {
        if ("play".equals(action) || "pause".equals(action) || "toggle".equals(action)
                || "next".equals(action) || "prev".equals(action)) {
            return action;
        }
        return null;
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            android.os.PowerManager pm = (android.os.PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                wakeLock = pm.newWakeLock(android.os.PowerManager.PARTIAL_WAKE_LOCK, "LoveLink:AudioPlaybackLock");
                wakeLock.setReferenceCounted(false);
            }

            // Request OS-level runtime permissions for Camera, Microphone, Audio, Location, and Notifications
            java.util.List<String> permList = new java.util.ArrayList<>();
            permList.add(Manifest.permission.RECORD_AUDIO);
            permList.add(Manifest.permission.CAMERA);
            permList.add(Manifest.permission.MODIFY_AUDIO_SETTINGS);
            permList.add(Manifest.permission.ACCESS_FINE_LOCATION);
            permList.add(Manifest.permission.ACCESS_COARSE_LOCATION);
            if (Build.VERSION.SDK_INT >= 33) {
                permList.add("android.permission.POST_NOTIFICATIONS");
            }

            java.util.List<String> needPerms = new java.util.ArrayList<>();
            for (String p : permList) {
                if (ContextCompat.checkSelfPermission(this, p) != PackageManager.PERMISSION_GRANTED) {
                    needPerms.add(p);
                }
            }
            if (!needPerms.isEmpty()) {
                androidx.core.app.ActivityCompat.requestPermissions(this, needPerms.toArray(new String[0]), 101);
            }

            audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);

            LoveLinkMediaService.setMediaActionListener(action -> {
                String safeAction = sanitizeMediaAction(action);
                if (safeAction == null) return;
                runOnUiThread(() -> {
                    if (getBridge() != null && getBridge().getWebView() != null) {
                        getBridge().getWebView().evaluateJavascript(
                            "window.dispatchEvent(new CustomEvent('lovelink:media_action', { detail: { action: '" + safeAction + "' } }));",
                            null
                        );
                    }
                });
            });

            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView webView = getBridge().getWebView();
                CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

                webView.addJavascriptInterface(new NativeAudioBridge(), "LoveLinkNativeAudio");

                WebSettings settings = webView.getSettings();
                settings.setJavaScriptCanOpenWindowsAutomatically(true);
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setGeolocationEnabled(true);
                settings.setMediaPlaybackRequiresUserGesture(false);
                settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

                // Chrome Mobile user agent string to eliminate Google 'disallowed_useragent' errors
                settings.setUserAgentString("Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36");

                // Subclass Capacitor's BridgeWebChromeClient so <input type="file"> (onShowFileChooser),
                // JS dialogs, and fullscreen video stay intact while enforcing trusted-origin guards.
                webView.setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
                    @Override
                    public void onPermissionRequest(final PermissionRequest request) {
                        runOnUiThread(() -> {
                            String origin = request.getOrigin() != null ? request.getOrigin().toString() : null;
                            if (!isTrustedOrigin(origin)) {
                                request.deny();
                                return;
                            }
                            List<String> resources = Arrays.asList(request.getResources());
                            boolean needsCam = resources.contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE);
                            boolean needsMic = resources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE);
                            boolean hasCam = !needsCam || ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
                            boolean hasMic = !needsMic || ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
                            if (hasCam && hasMic) {
                                request.grant(request.getResources());
                            } else {
                                super.onPermissionRequest(request);
                            }
                        });
                    }

                    @Override
                    public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                        runOnUiThread(() -> {
                            if (!isTrustedOrigin(origin)) {
                                callback.invoke(origin, false, false);
                                return;
                            }
                            super.onGeolocationPermissionsShowPrompt(origin, callback);
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
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
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
        // Hold Partial WakeLock when screen turns off / app switches so WebView timers & audio continue
        try {
            if (isMediaPlaying && wakeLock != null && !wakeLock.isHeld()) {
                wakeLock.acquire(30 * 60 * 1000L);
            }
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView wv = getBridge().getWebView();
                wv.resumeTimers();
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onDestroy() {
        LoveLinkMediaService.setMediaActionListener(null);
        super.onDestroy();
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
            stopService(new Intent(this, LoveLinkMediaService.class));
        } catch (Exception ignored) {}
    }
}
