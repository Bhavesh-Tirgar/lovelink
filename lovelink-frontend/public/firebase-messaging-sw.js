// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing the generated config
const firebaseConfig = {
    apiKey: "AIzaSyDRGkpcR78KzJ2rau_Q_5PiDWErm_afTmY",
    authDomain: "love-link-48830.firebaseapp.com",
    projectId: "love-link-48830",
    storageBucket: "love-link-48830.firebasestorage.app",
    messagingSenderId: "486498555432",
    appId: "1:486498555432:web:98fc63a1fed99132b4071d",
};

firebase.initializeApp(firebaseConfig);

// Retrieve firebase messaging
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    const data = payload.data || {};
    const isCall = data.type === 'incoming_call';
    const isEnd = data.type === 'call_ended' || data.type === 'call_declined';

    // Auto-dismiss notification if call was ended or declined by the other party
    if (isEnd && data.call_id) {
        const callTag = `call-${data.call_id}`;
        self.registration.getNotifications({ tag: callTag }).then((notifications) => {
            notifications.forEach(n => n.close());
        });
        return;
    }

    let notificationTitle = payload.notification?.title || "LoveLink";
    let body = payload.notification?.body || "New romantic alert from your partner 💕";
    let actions = [];
    let vibratePattern = [200, 100, 200];
    let requireInteraction = false;
    let tag = 'lovelink-general';

    if (isCall) {
        const callType = (data.call_type || 'video').toUpperCase();
        const callerName = data.caller_name || 'Your Partner';
        notificationTitle = `📞 Incoming ${callType} Call`;
        body = `${callerName} is calling you right now...`;
        requireInteraction = true; // Stays on screen like a real phone call
        tag = `call-${data.call_id}`;
        vibratePattern = [600, 300, 600, 300, 600, 300, 600]; // Ring rhythm
        actions = [
            {
                action: 'answer',
                title: '💚 Answer Call',
                icon: '/logo192.png'
            },
            {
                action: 'decline',
                title: '❌ Decline',
                icon: '/logo192.png'
            }
        ];
    }

    const notificationOptions = {
        body: body,
        icon: '/logo192.png',
        badge: '/favicon.ico',
        vibrate: vibratePattern,
        requireInteraction: requireInteraction,
        tag: tag,
        renotify: true,
        actions: actions,
        data: {
            ...data,
            url: isCall ? `/call/${data.call_id}` : (data.url || '/')
        }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// PWA Service Worker Lifecycle
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// Notification click handler: handles Lock-Screen Answer / Decline and window focus
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const action = event.action;
    const data = event.notification.data || {};

    if (action === 'decline') {
        // Declined from lock screen
        return;
    }

    const targetUrl = data.url || (data.call_id ? `/call/${data.call_id}` : '/');

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (let client of windowClients) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    if ('navigate' in client && targetUrl !== '/') {
                        client.navigate(targetUrl);
                    }
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

// Fetch event listener to satisfy PWA criteria
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    
    // Never intercept WebSocket or API calls
    const url = new URL(event.request.url);
    if (url.protocol === 'ws:' || url.protocol === 'wss:' || url.pathname.startsWith('/api') || url.hostname.includes('onrender.com')) {
        return;
    }

    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});
