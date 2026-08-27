import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithCredential,
  signInWithRedirect,
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

// Initialize Native Google Auth Plugin on Native Android / iOS
let nativeGoogleAuthReady = false;
if (Capacitor.isNativePlatform()) {
  try {
    GoogleAuth.initialize({
      clientId: GOOGLE_WEB_CLIENT_ID,
      scopes: ['profile', 'email'],
      grantOfflineAccess: true
    });
    nativeGoogleAuthReady = true;
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
 * Google Sign-In with automatic fallback:
 * 1. Try native Android OS Account Picker (fastest, best UX)
 * 2. If native fails (SHA-1 not registered), fallback to Firebase web popup/redirect
 */
export const signInWithGoogle = async (): Promise<User | null> => {
  if (Capacitor.isNativePlatform() && nativeGoogleAuthReady) {
    try {
      // 📱 Attempt 1: Native Android OS Account Picker
      const googleUser = await GoogleAuth.signIn();
      const idToken = googleUser.authentication?.idToken;
      if (idToken) {
        const credential = GoogleAuthProvider.credential(idToken);
        const authResult = await signInWithCredential(auth, credential);
        return authResult.user;
      }
      // If no idToken but we got user info, try accessToken
      const accessToken = googleUser.authentication?.accessToken;
      if (accessToken) {
        const credential = GoogleAuthProvider.credential(null, accessToken);
        const authResult = await signInWithCredential(auth, credential);
        return authResult.user;
      }
      throw new Error("No tokens received from native Google Sign-In");
    } catch (nativeErr: any) {
      console.warn("Native Google Sign-In failed, trying web fallback:", nativeErr);
      
      // If user explicitly cancelled, don't fallback - just throw
      const errMsg = String(nativeErr?.message || nativeErr || '').toLowerCase();
      const errCode = String(nativeErr?.code || '');
      if (
        errMsg.includes('cancel') ||
        errMsg.includes('closed') ||
        errCode === '12501' ||
        nativeErr?.type === 'userCanceled'
      ) {
        throw { code: 'auth/popup-closed-by-user', message: 'Google sign-in cancelled' };
      }

      // 📱 Attempt 2: Firebase web-based Google Sign-In (works inside Capacitor WebView)
      try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
      } catch (popupErr: any) {
        console.warn("Popup also failed, trying redirect:", popupErr);
        // 📱 Attempt 3: Firebase redirect-based sign-in (last resort)
        await signInWithRedirect(auth, googleProvider);
        return null; // redirect will reload page, result picked up in checkGoogleRedirectResult
      }
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
  if (Capacitor.isNativePlatform() && nativeGoogleAuthReady) {
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
