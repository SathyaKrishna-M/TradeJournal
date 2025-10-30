// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { handleFirebaseError } from "@/lib/firebaseErrorHandler";
import { toast } from "@/hooks/use-toast";

// ✅ Firebase Config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ✅ Login with Email
export async function loginWithEmail(email: string, password: string) {
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    handleFirebaseError(error, "Login");
    throw error;
  }
}



// ✅ Signup with Email
export async function signupWithEmail(email: string, password: string) {
  try {
    await createUserWithEmailAndPassword(auth, email, password);
  } catch (error) {
    handleFirebaseError(error, "Signup");
    throw error;
  }
}

// ✅ Google Login (optional)
export async function loginWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  } catch (error) {
    handleFirebaseError(error, "Google Login");
    throw error;
  }
}

// ✅ Password Reset
export async function resetPassword(email: string) {
  try {
    await sendPasswordResetEmail(auth, email);
    toast({
      title: "📩 Password Reset Email Sent",
      description: "Check your inbox for a reset link.",
    });
  } catch (error: unknown) {
    console.error("Reset password error:", error);
    let message = "Something went wrong. Please try again.";

    if (typeof error === "object" && error !== null && "code" in error) {
      const firebaseError = error as { code: string; message?: string };
      switch (firebaseError.code) {
        case "auth/user-not-found":
          message = "🚫 No user found with this email.";
          break;
        case "auth/invalid-email":
          message = "⚠️ Please enter a valid email address.";
          break;
      }
    }

    toast({
      title: "Password Reset Failed",
      description: message,
      variant: "destructive",
    });
  }
}

// ✅ Logout
export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    handleFirebaseError(error, "Logout");
    throw error;
  }
}

console.log("🔥 Firebase connected ✅");
