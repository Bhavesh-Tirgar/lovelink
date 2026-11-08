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

    const notificationTitle = payload.notification?.title || "LoveLink";
    const notificationOptions = {
        body: payload.notification?.body || "New romantic alert from your partner 💕",
        icon: '/logo192.png',
        badge: '/favicon.ico',
        vibrate: [200, 100, 200],
        data: payload.data || {}
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

// Notification click handler: focuses or opens LoveLink window
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || '/';

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
