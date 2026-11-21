import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

export const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyDRGkpcR78KzJ2rau_Q_5PiDWErm_afTmY",
  authDomain: "love-link-48830.firebaseapp.com",
  projectId: "love-link-48830",
  storageBucket: "love-link-48830.firebasestorage.app",
  messagingSenderId: "486498555432",
  appId: "1:486498555432:web:98fc63a1fed99132b4071d",
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
