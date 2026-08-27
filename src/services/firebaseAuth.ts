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

export const signInWithGoogle = async (): Promise<User | null> => {
  if (Capacitor.isNativePlatform() && nativeGoogleAuthReady) {
    // 📱 Native Android OS Account Picker
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
