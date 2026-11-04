// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing the generated config
// Note: In a real environment, you'd paste your Firebase console keys here. 
// For this stage, we inject a mockup to handle the background interception.
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

    // Customize notification here
    const notificationTitle = payload.notification.title || "LoveLink";
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/logo192.png',
        data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
