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
        window.localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// â”€â”€ Firebase Web Push Initialization â”€â”€
const firebaseConfig = {
  apiKey: "AIzaSyDRGkpcR78KzJ2rau_Q_5PiDWErm_afTmY",
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

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, { serviceWorkerRegistration: registration })
        .catch(err => {
          console.warn("Failed to get FCM token:", err);
          return null;
        });

      if (token) {
        console.log("FCM Token obtained");
        await api.post('/auth/fcm-token', { fcm_token: token }).catch(err => console.error("Failed to save FCM token", err));
      }

      onMessage(messaging, (payload) => {
        console.log('Message received in foreground: ', payload);
      });
    }
  } catch (e) {
    console.warn("FCM registration deferred:", e);
  }
};
