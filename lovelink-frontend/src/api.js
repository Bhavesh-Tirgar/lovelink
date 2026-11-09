import axios from 'axios';
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = window.localStorage.getItem('token');
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        window.localStorage.removeItem('token');
        window.localStorage.removeItem('user');
        // Prevent infinite reload loops if already on login/signup page!
        if (path !== '/login' && path !== '/signup') {
          window.location.replace('/login');
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Firebase Web Push Initialization
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "",
  authDomain: "love-link-48830.firebaseapp.com",
  projectId: "love-link-48830",
  storageBucket: "love-link-48830.firebasestorage.app",
  messagingSenderId: "486498555432",
  appId: "1:486498555432:web:98fc63a1fed99132b4071d",
};

export const initFirebasePush = async () => {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const app = initializeApp(firebaseConfig);
    const messaging = getMessaging(app);

    const swUrl = firebaseConfig.apiKey ? `/firebase-messaging-sw.js?apiKey=${encodeURIComponent(firebaseConfig.apiKey)}` : '/firebase-messaging-sw.js';
    const registration = await navigator.serviceWorker.register(swUrl);

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, { serviceWorkerRegistration: registration })
        .catch(err => {
          console.warn("Failed to get FCM token:", err);
          return null;
        });

      // ONLY sync FCM token if the user is already authenticated!
      if (token && typeof window !== 'undefined' && window.localStorage.getItem('token')) {
        await api.post('/auth/fcm-token', { fcm_token: token }).catch(() => {});
      }

      onMessage(messaging, (payload) => {
        console.log('Message received in foreground: ', payload);
      });
    }
  } catch (e) {
    console.warn("FCM registration deferred:", e);
  }
};
