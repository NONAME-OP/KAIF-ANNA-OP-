import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyByElK0VEl6A5Hwe9RHDBnWZjqtUYq4CsY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "kaif-e73f8.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "kaif-e73f8",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "kaif-e73f8.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "964097750824",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:964097750824:web:52230ad0a2289b4a80421d",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-304RK6D19S",
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain
);

let app = null;
let auth = null;
let googleProvider = null;
let analytics = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: "select_account" });

    if (typeof window !== "undefined") {
      isSupported()
        .then((supported) => {
          if (supported) analytics = getAnalytics(app);
        })
        .catch(() => {});
    }
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
}

export { app, auth, googleProvider, signInWithPopup, analytics };
