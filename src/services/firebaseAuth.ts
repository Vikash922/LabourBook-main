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

// 1. Initialize Native Google Auth Plugin on Native Platforms
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
 * Native Android In-App Google Sign-In (using @codetrix-studio/capacitor-google-auth)
 * Pops up the native Android Google Account Picker bottom-sheet without opening Chrome.
 */
export const signInWithGoogle = async (): Promise<User | null> => {
  if (Capacitor.isNativePlatform()) {
    try {
      // 📱 NATIVE ANDROID GOOGLE ACCOUNT PICKER
      const googleUser = await GoogleAuth.signIn();
      const idToken = googleUser.authentication.idToken;
      const credential = GoogleAuthProvider.credential(idToken);
      const res = await signInWithCredential(auth, credential);
      return res.user;
    } catch (err: any) {
      console.error("Native Google Sign-In error:", err);
      if (
        err?.message?.includes('cancel') ||
        err?.message?.includes('closed') ||
        err?.code === '12501' ||
        err?.type === 'userCanceled'
      ) {
        throw { code: 'auth/popup-closed-by-user', message: 'Google sign-in cancelled' };
      }
      throw err;
    }
  } else {
    // 🌐 WEB BROWSER POPUP
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
