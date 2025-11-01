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
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  User,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
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
export const storage = getStorage(app);

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

// ✅ Update User Profile
export async function updateUserProfile(displayName?: string, photoURL?: string) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("No user logged in");

    const updates: { displayName?: string; photoURL?: string } = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (photoURL !== undefined) updates.photoURL = photoURL;

    await updateProfile(user, updates);
    toast({
      title: "✅ Profile Updated",
      description: "Your profile has been updated successfully.",
    });
  } catch (error) {
    handleFirebaseError(error, "Update Profile");
    throw error;
  }
}

// ✅ Sanitize filename for Firebase Storage
function sanitizeFileName(fileName: string): string {
  // Get file extension
  const extension = fileName.split('.').pop() || 'jpg';
  // Remove extension, sanitize, and add extension back
  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || 'image';
  // Replace special characters with underscores
  const sanitized = nameWithoutExt.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
  return `${sanitized}.${extension}`;
}

// ✅ Upload Profile Picture
export async function uploadProfilePicture(file: File): Promise<string> {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("No user logged in");

    // Sanitize filename to avoid CORS and special character issues
    const sanitizedName = sanitizeFileName(file.name);
    const fileRef = ref(storage, `profile-pictures/${user.uid}/${Date.now()}_${sanitizedName}`);
    
    // Upload with metadata
    const metadata = {
      contentType: file.type,
      customMetadata: {
        originalName: file.name,
      },
    };
    
    await uploadBytes(fileRef, file, metadata);
    const downloadURL = await getDownloadURL(fileRef);
    
    await updateProfile(user, { photoURL: downloadURL });
    
    toast({
      title: "✅ Profile Picture Updated",
      description: "Your profile picture has been updated successfully.",
    });
    
    return downloadURL;
  } catch (error) {
    handleFirebaseError(error, "Upload Profile Picture");
    throw error;
  }
}

// ✅ Change Password
export async function changeUserPassword(currentPassword: string, newPassword: string) {
  try {
    const user = auth.currentUser;
    if (!user || !user.email) throw new Error("No user logged in");

    // Reauthenticate user
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // Update password
    await updatePassword(user, newPassword);
    
    toast({
      title: "✅ Password Changed",
      description: "Your password has been changed successfully.",
    });
  } catch (error) {
    handleFirebaseError(error, "Change Password");
    throw error;
  }
}

console.log("🔥 Firebase connected ✅");
