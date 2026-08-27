import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithCredential,
  getRedirectResult,
  signOut,
  sendPasswordResetEmail,
  updateProfile as updateFirebaseProfile,
  onAuthStateChanged,
  User,
  GoogleAuthProvider
} from "firebase/auth";
import { auth, googleProvider, GOOGLE_WEB_CLIENT_ID } from "../firebase";
import { Capacitor } from "@capacitor/core";
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";

// 1. Initialize Native Google Auth Plugin on Native Android / iOS
if (Capacitor.isNativePlatform()) {
  try {
    GoogleAuth.initialize({
      clientId: GOOGLE_WEB_CLIENT_ID,
      scopes: ['profile', 'email'],
      grantOfflineAccess: true
    });
  } catch (e) {
    console.warn("GoogleAuth init warning:", e);
  }
}

export interface AuthUserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export const signUpWithEmail = async (
  email: string,
  pass: string,
  name?: string
): Promise<User> => {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  if (name && cred.user) {
    try {
      await updateFirebaseProfile(cred.user, { displayName: name.trim() });
    } catch (e) {
      console.warn("Failed to set user display name", e);
    }
  }
  return cred.user;
};

export const signInWithEmail = async (
  email: string,
  pass: string
): Promise<User> => {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
  return cred.user;
};

/**
 * Native Android OS Google Sign-In via @codetrix-studio/capacitor-google-auth
 * Triggers Android OS native account selection dialog without opening Chrome.
 */
export const signInWithGoogle = async (): Promise<User | null> => {
  if (Capacitor.isNativePlatform()) {
    // 📱 ANDROID OS NATIVE ACCOUNT PICKER
    const googleUser = await GoogleAuth.signIn();
    const idToken = googleUser.authentication?.idToken;
    if (!idToken) {
      throw new Error("No ID Token received from Google Sign-In");
    }
    const credential = GoogleAuthProvider.credential(idToken);
    const authResult = await signInWithCredential(auth, credential);
    return authResult.user;
  } else {
    // 🌐 WEB BROWSER FLOW
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  }
};

export const checkGoogleRedirectResult = async (): Promise<User | null> => {
  try {
    const result = await getRedirectResult(auth);
    return result?.user || null;
  } catch (err) {
    console.warn("Redirect auth error:", err);
    return null;
  }
};

export const sendPasswordReset = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(auth, email.trim());
};

export const signOutFirebase = async (): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    try {
      await GoogleAuth.signOut();
    } catch {}
  }
  await signOut(auth);
};

export const getCurrentFirebaseUser = (): User | null => {
  return auth.currentUser;
};

export const subscribeToAuthChanges = (
  callback: (user: User | null) => void
) => {
  return onAuthStateChanged(auth, callback);
};
