"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

interface FirebaseError extends Error {
  code?: string;
  message: string;
}

export default function AuthPage() {
  const { signupWithEmail, loginWithEmail, resetPassword, loginWithGoogle } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await loginWithEmail(email, password);
        toast({
          title: "✅ Login Successful!",
          description: "Welcome back to TracknTrade.",
        });
        navigate("/dashboard");
      } else {
        await signupWithEmail(email, password);
        toast({
          title: "🎉 Account Created!",
          description: "Welcome to TracknTrade.",
        });
        navigate("/dashboard");
      }
    } catch (error: unknown) {
      const err = error as FirebaseError;
      if (err.code === "auth/user-not-found") {
        toast({
          title: "User not registered",
          description: "Please sign up first.",
          variant: "destructive",
        });
      } else if (err.code === "auth/wrong-password") {
        toast({
          title: "Incorrect password",
          description: "Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: err.message || "Something went wrong.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      toast({
        title: "Enter your email first",
        variant: "destructive",
      });
      return;
    }

    try {
      await resetPassword(email);
      toast({
        title: "Password reset email sent",
        description: "Check your inbox.",
      });
    } catch {
      toast({
        title: "Error sending reset email",
        variant: "destructive",
      });
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      toast({
        title: "Welcome!",
        description: "Logged in successfully with Google.",
      });
      navigate("/dashboard");
    } catch (err: unknown) {
      const error = err as FirebaseError;
      toast({
        title: "Google Login Failed",
        description: error.message || "Unable to sign in with Google.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-[#020202] overflow-hidden">
      {/* Subtle animated lighting background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,156,0.15)_0%,transparent_70%)] blur-3xl animate-pulse"></div>

      {/* Auth Card */}
      <Card className="w-[400px] backdrop-blur-xl bg-black/60 border border-[#00FF9C]/20 text-white shadow-[0_0_30px_rgba(0,255,156,0.1)] z-10">
        <CardContent className="p-8">
          {/* Logo + Title */}
          <div className="flex items-center gap-3 mb-6">
            <motion.div
              animate={{ scale: [1, 1.05, 1], rotate: [0, 3, -3, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <motion.img
                src="/favicon.png"
                alt="TracknTrade Logo"
                className="w-12 h-12 drop-shadow-[0_0_15px_#00FF88]"
              />
            </motion.div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-white">TracknTrade</h1>
              <p className="text-sm text-slate-400">Track trades • Analyze performance</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-black/50 border-[#00FF9C]/30 text-white placeholder:text-gray-400"
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-black/50 border-[#00FF9C]/30 text-white placeholder:text-gray-400"
            />

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00FF9C] text-black font-semibold hover:bg-[#00C853] transition-all"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : isLogin ? "Login" : "Sign Up"}
            </Button>
          </form>

          {/* Forgot Password */}
          {isLogin && (
            <button
              onClick={handleResetPassword}
              className="text-sm text-[#00FF9C] hover:underline mt-2 block text-center"
            >
              Forgot password?
            </button>
          )}

          {/* Divider */}
          <div className="relative flex items-center justify-center my-4">
            <span className="absolute bg-black px-2 text-gray-400 text-sm">or</span>
            <div className="w-full h-px bg-[#00FF9C]/20"></div>
          </div>

          {/* Google Login Button */}
          <Button
            onClick={handleGoogleLogin}
            variant="outline"
            className="w-full bg-white text-black font-medium border border-gray-300 hover:bg-gray-100 transition-all flex items-center justify-center gap-3"
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
              className="w-5 h-5"
            />
            Continue with Google
          </Button>
        </CardContent>

        <CardFooter className="text-center text-sm text-gray-400">
          {isLogin ? (
            <p>
              New user?{" "}
              <button onClick={() => setIsLogin(false)} className="text-[#00FF9C] hover:underline">
                Sign up
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{" "}
              <button onClick={() => setIsLogin(true)} className="text-[#00FF9C] hover:underline">
                Login
              </button>
            </p>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
