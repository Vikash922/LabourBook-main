import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from "firebase/firestore";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCPKtOU1awmMgWaoSNM2sd18b33uxl7LHk",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "laborbook-4c47e.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "laborbook-4c47e",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "laborbook-4c47e.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1027179208222",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1027179208222:web:ca30b44159b5d5c36a580f"
};

export const GOOGLE_WEB_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID ||
  "1027179208222-2hhdrgohaaa7ed068smm0tekptejq4k8.apps.googleusercontent.com";

// Initialize Firebase App singleton
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Initialize Firestore with Offline Persistence Cache (Offline-First)
let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch (e) {
  // If already initialized or fallback needed
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;
