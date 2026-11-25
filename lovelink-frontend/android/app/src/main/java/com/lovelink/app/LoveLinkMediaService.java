package com.lovelink.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.drawable.Icon;
import android.media.MediaMetadata;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import java.lang.ref.WeakReference;

public class LoveLinkMediaService extends Service {
    public interface MediaActionListener {
        void onMediaAction(String action);
    }

    public static final String ACTION_START = "com.lovelink.app.action.START_MEDIA";
    public static final String ACTION_STOP = "com.lovelink.app.action.STOP_MEDIA";
    public static final String ACTION_PREV = "com.lovelink.app.action.PREV_MEDIA";
    public static final String ACTION_TOGGLE = "com.lovelink.app.action.TOGGLE_MEDIA";
    public static final String ACTION_NEXT = "com.lovelink.app.action.NEXT_MEDIA";
    public static final String EXTRA_TITLE = "title";
    public static final String EXTRA_ARTIST = "artist";

    private static final String CHANNEL_ID = "lovelink_media_playback";
    private static final int NOTIFICATION_ID = 2026;
    private static volatile WeakReference<MediaActionListener> actionListenerRef = new WeakReference<>(null);

    private PowerManager.WakeLock wakeLock;
    private MediaSession mediaSession;
    private String lastTitle = "LoveLink Radio";
    private String lastArtist = "Playing in background";

    public static void setMediaActionListener(MediaActionListener listener) {
        actionListenerRef = new WeakReference<>(listener);
    }

    private static void dispatchMediaAction(String action) {
        MediaActionListener listener = actionListenerRef.get();
        if (listener != null) {
            listener.onMediaAction(action);
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        initMediaSession();
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "LoveLink:BackgroundAudioWakeLock");
                wakeLock.setReferenceCounted(false);
            }
        } catch (Exception ignored) {}
    }

    private void initMediaSession() {
        try {
            mediaSession = new MediaSession(this, "LoveLinkMediaSession");
            mediaSession.setCallback(new MediaSession.Callback() {
                @Override
                public void onPlay() {
                    dispatchMediaAction("play");
                }

                @Override
                public void onPause() {
                    dispatchMediaAction("pause");
                }

                @Override
                public void onSkipToNext() {
                    dispatchMediaAction("next");
                }

                @Override
                public void onSkipToPrevious() {
                    dispatchMediaAction("prev");
                }
            });
            mediaSession.setActive(true);
        } catch (Exception ignored) {}
    }

    private void updateMediaSessionState(boolean playing, String title, String artist) {
        if (mediaSession == null) return;
        try {
            MediaMetadata metadata = new MediaMetadata.Builder()
                    .putString(MediaMetadata.METADATA_KEY_TITLE, title)
                    .putString(MediaMetadata.METADATA_KEY_ARTIST, artist)
                    .putString(MediaMetadata.METADATA_KEY_ALBUM, "Couple Sanctuary")
                    .build();
            mediaSession.setMetadata(metadata);

            long actions = PlaybackState.ACTION_PLAY
                    | PlaybackState.ACTION_PAUSE
                    | PlaybackState.ACTION_PLAY_PAUSE
                    | PlaybackState.ACTION_SKIP_TO_NEXT
                    | PlaybackState.ACTION_SKIP_TO_PREVIOUS;
            int state = playing ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_STOPPED;
            PlaybackState playbackState = new PlaybackState.Builder()
                    .setActions(actions)
                    .setState(state, PlaybackState.PLAYBACK_POSITION_UNKNOWN, playing ? 1.0f : 0.0f)
                    .build();
            mediaSession.setPlaybackState(playbackState);
            mediaSession.setActive(playing);
        } catch (Exception ignored) {}
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : ACTION_START;

        if (ACTION_STOP.equals(action)) {
            updateMediaSessionState(false, lastTitle, lastArtist);
            releaseLock();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                stopForeground(STOP_FOREGROUND_REMOVE);
            } else {
                stopForeground(true);
            }
            stopSelf();
            return START_NOT_STICKY;
        }

        if (ACTION_PREV.equals(action)) {
            dispatchMediaAction("prev");
            return START_STICKY;
        }
        if (ACTION_TOGGLE.equals(action)) {
            dispatchMediaAction("toggle");
            return START_STICKY;
        }
        if (ACTION_NEXT.equals(action)) {
            dispatchMediaAction("next");
            return START_STICKY;
        }

        if (intent != null && intent.getStringExtra(EXTRA_TITLE) != null) {
            lastTitle = intent.getStringExtra(EXTRA_TITLE);
        }
        if (intent != null && intent.getStringExtra(EXTRA_ARTIST) != null) {
            lastArtist = intent.getStringExtra(EXTRA_ARTIST);
        }

        updateMediaSessionState(true, lastTitle, lastArtist);
        Notification notification = buildNotification(lastTitle, lastArtist);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
        } catch (Exception e) {
            android.util.Log.w("LoveLinkMediaService", "Fallback startForeground without type", e);
            try {
                startForeground(NOTIFICATION_ID, notification);
            } catch (Exception ignored) {}
        }

        acquireLock();
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        releaseLock();
        if (mediaSession != null) {
            try {
                mediaSession.setActive(false);
                mediaSession.release();
            } catch (Exception ignored) {}
            mediaSession = null;
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void acquireLock() {
        try {
            if (wakeLock != null && !wakeLock.isHeld()) {
                wakeLock.acquire(6 * 60 * 60 * 1000L);
            }
        } catch (Exception ignored) {}
    }

    private void releaseLock() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
        } catch (Exception ignored) {}
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "LoveLink Background Music",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Keeps couple music streaming smoothly when screen is off");
            channel.setShowBadge(false);
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) {
                nm.createNotificationChannel(channel);
            }
        }
    }

    private PendingIntent serviceActionIntent(String action, int requestCode) {
        Intent actionIntent = new Intent(this, LoveLinkMediaService.class);
        actionIntent.setAction(action);
        int piFlags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getService(this, requestCode, actionIntent, piFlags);
    }

    private Notification buildNotification(String title, String artist) {
        Intent openAppIntent = new Intent(this, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int piFlags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        PendingIntent contentIntent = PendingIntent.getActivity(this, 0, openAppIntent, piFlags);

        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(this, CHANNEL_ID);
        } else {
            builder = new Notification.Builder(this);
        }

        Notification.Action prevAction = new Notification.Action.Builder(
                Icon.createWithResource(this, android.R.drawable.ic_media_previous),
                "Previous",
                serviceActionIntent(ACTION_PREV, 1)
        ).build();

        Notification.Action pauseAction = new Notification.Action.Builder(
                Icon.createWithResource(this, android.R.drawable.ic_media_pause),
                "Pause",
                serviceActionIntent(ACTION_TOGGLE, 2)
        ).build();

        Notification.Action nextAction = new Notification.Action.Builder(
                Icon.createWithResource(this, android.R.drawable.ic_media_next),
                "Next",
                serviceActionIntent(ACTION_NEXT, 3)
        ).build();

        builder
                .setContentTitle(title)
                .setContentText(artist)
                .setSmallIcon(android.R.drawable.ic_media_play)
                .setContentIntent(contentIntent)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .addAction(prevAction)
                .addAction(pauseAction)
                .addAction(nextAction);

        if (mediaSession != null) {
            builder.setStyle(
                    new Notification.MediaStyle()
                            .setMediaSession(mediaSession.getSessionToken())
                            .setShowActionsInCompactView(0, 1, 2)
            );
        }

        return builder.build();
    }
}
