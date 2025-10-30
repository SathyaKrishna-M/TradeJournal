// src/lib/firebaseErrorHandler.ts
import { toast } from "@/components/ui/use-toast"; // Adjust if your toast import path differs
import { FirebaseError } from "firebase/app";

/**
 * Handles Firebase and general errors, logs them,
 * and shows a toast notification with a friendly message.
 */
export function handleFirebaseError(error: unknown, action?: string) {
  let message = "Something went wrong. Please try again.";

  // Handle Firebase-specific errors
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/invalid-email":
        message = "The email address is invalid.";
        break;
      case "auth/email-already-in-use":
        message = "This email is already registered.";
        break;
      case "auth/user-not-found":
        message = "No user found with this email.";
        break;
      case "auth/wrong-password":
        message = "Incorrect password.";
        break;
      case "auth/weak-password":
        message = "Password should be at least 6 characters.";
        break;
      case "auth/network-request-failed":
        message = "Network issue. Please check your connection.";
        break;
      default:
        message = error.message || "Unexpected error occurred.";
        break;
    }
  }
  // Handle generic JavaScript errors
  else if (error instanceof Error) {
    message = error.message;
  }
  // Handle unknown errors (non-Error types)
  else if (typeof error === "string") {
    message = error;
  }

  // Log to console for debugging (optional)
  console.error(`${action || "Operation"} failed:`, message);

  // Show toast notification
  toast({
    title: action ? `${action} failed` : "Error",
    description: message,
    variant: "destructive",
  });
}
