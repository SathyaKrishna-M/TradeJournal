"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function AuthForm() {
  const { signupWithEmail, loginWithEmail, resetPassword, loginWithGoogle } = useAuth();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await loginWithEmail(email, password);
        toast({ title: "Logged in", description: "Welcome back!" });
      } else {
        await signupWithEmail(email, password);
        toast({ title: "Account created", description: "You can now log in." });
      }
      navigate("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Authentication failed";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  const handleReset = async () => {
    if (!email) {
      toast({ title: "Enter email", description: "Please enter your email first.", variant: "destructive" });
      return;
    }
    try {
      await resetPassword(email);
      toast({ title: "Reset email sent", description: "Check your inbox." });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send reset email.";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  const handleGoogle = async () => {
    try {
      await loginWithGoogle();
      toast({ title: "Signed in", description: "Welcome!" });
      navigate("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Google login failed";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <form onSubmit={handleSubmit} className="w-full max-w-md p-6 rounded-2xl bg-card/70 border border-border">
        <h2 className="text-xl font-semibold mb-4">{isLogin ? "Login" : "Sign up"}</h2>

        <input className="w-full p-2 rounded-md bg-background/30 border border-border mb-3" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
        <input className="w-full p-2 rounded-md bg-background/30 border border-border mb-3" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />

        <button className="w-full py-2 rounded-md bg-[#00FF9C] text-black font-semibold mb-3">{isLogin ? "Login" : "Create account"}</button>

        {isLogin ? (
          <div className="flex justify-between items-center">
            <button type="button" onClick={handleReset} className="text-sm text-[#00FF9C]">
              Forgot password?
            </button>
            <button type="button" onClick={() => setIsLogin(false)} className="text-sm text-muted-foreground">
              Sign up
            </button>
          </div>
        ) : (
          <p className="text-sm mt-2 text-muted-foreground">
            Already have an account?{" "}
            <button type="button" onClick={() => setIsLogin(true)} className="text-[#00FF9C]">
              Log in
            </button>
          </p>
        )}

        <div className="mt-4">
          <button type="button" onClick={handleGoogle} className="w-full py-2 rounded-md border border-border bg-card/60">
            Continue with Google
          </button>
        </div>
      </form>
    </div>
  );
}
