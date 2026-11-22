import axios from 'axios';
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { app } from "./utils/firebase";

const getDefaultBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  if (typeof window !== 'undefined') {
    // Only use local development backend if specifically accessed via localhost:3000 in browser
    if (
      window.location.hostname === 'localhost' &&
      window.location.port === '3000' &&
      window.location.protocol !== 'capacitor:' &&
      !window['Capacitor']?.isNativePlatform?.() &&
      !navigator.userAgent.includes('Capacitor')
    ) {
      return 'http://localhost:8000';
    }
  }
  return 'https://lovelink-sfzx.onrender.com';
};

const api = axios.create({
  baseURL: getDefaultBaseUrl(),
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

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest?._retry) {
      if (typeof window !== 'undefined') {
        const refreshToken = window.localStorage.getItem('refresh_token');
        const path = window.location.pathname;

        // Skip refresh attempts for auth routes or missing refresh token
        if (
          !refreshToken ||
          originalRequest.url?.includes('/auth/login') ||
          originalRequest.url?.includes('/auth/signup') ||
          originalRequest.url?.includes('/auth/refresh')
        ) {
          window.localStorage.removeItem('token');
          window.localStorage.removeItem('refresh_token');
          window.localStorage.removeItem('user');
          if (path !== '/login' && path !== '/signup') {
            window.location.replace('/login');
          }
          return Promise.reject(error);
        }

        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers['Authorization'] = `Bearer ${token}`;
              return api(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const baseURL = api.defaults.baseURL || process.env.REACT_APP_API_URL || 'http://localhost:8000';
          const res = await axios.post(`${baseURL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          const { access_token, refresh_token: newRefreshToken } = res.data;
          window.localStorage.setItem('token', access_token);
          if (newRefreshToken) {
            window.localStorage.setItem('refresh_token', newRefreshToken);
          }
          api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
          originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
          processQueue(null, access_token);
          return api(originalRequest);
        } catch (refreshErr) {
          processQueue(refreshErr, null);
          window.localStorage.removeItem('token');
          window.localStorage.removeItem('refresh_token');
          window.localStorage.removeItem('user');
          if (path !== '/login' && path !== '/signup') {
            window.location.replace('/login');
          }
          return Promise.reject(refreshErr);
        } finally {
          isRefreshing = false;
        }
      }
    }

    // Render Cold Start Guard (502 / 504 / Network Timeout auto-retry)
    if (
      originalRequest &&
      (error.response?.status === 504 ||
        error.response?.status === 502 ||
        (!error.response && error.message?.includes('Network Error')))
    ) {
      originalRequest._coldRetryCount = (originalRequest._coldRetryCount || 0) + 1;
      if (originalRequest._coldRetryCount <= 3) {
        const delay = originalRequest._coldRetryCount * 3000;
        console.log(`[API] Server waking up from cold start... Retrying in ${delay}ms`);
        await new Promise((res) => setTimeout(res, delay));
        return api(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// Firebase Web Push Initialization
export const initFirebasePush = async () => {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const messaging = getMessaging(app);

    const apiKey = process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyDRGkpcR78KzJ2rau_Q_5PiDWErm_afTmY";
    const swUrl = apiKey ? `/firebase-messaging-sw.js?apiKey=${encodeURIComponent(apiKey)}` : '/firebase-messaging-sw.js';
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
        await api.post('/auth/fcm-token', { fcm_token: token }).catch(() => { });
      }

      onMessage(messaging, (payload) => {
        console.log('Message received in foreground: ', payload);
      });
    }
  } catch (e) {
    console.warn("FCM registration deferred:", e);
  }
};
