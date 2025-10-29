// src/pages/AuthPage.tsx
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom"; // ✅ Add this

export default function AuthPage() {
  const { signupWithEmail, loginWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const navigate = useNavigate(); // ✅ Add this

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isSignup) {
        await signupWithEmail(email, password);
        alert("✅ Account created successfully!");
      } else {
        await loginWithEmail(email, password);
        alert("✅ Logged in successfully!");
      }

      navigate("/dashboard"); // ✅ Redirect after success
    } catch (err) {
  if (err instanceof Error) {
    alert(err.message);
    console.error("Auth error:", err.message);
  } else {
    alert("An unexpected error occurred.");
    console.error("Unknown error:", err);
  }
}

  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-lg p-6 rounded-lg w-96"
      >
        <h2 className="text-2xl font-bold mb-4 text-center">
          {isSignup ? "Sign Up" : "Log In"}
        </h2>
        <input
          type="email"
          placeholder="Email"
          className="border w-full mb-3 p-2 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="border w-full mb-4 p-2 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button
          type="submit"
          className="bg-blue-600 text-white w-full py-2 rounded hover:bg-blue-700"
        >
          {isSignup ? "Sign Up" : "Log In"}
        </button>

        <p className="text-center mt-4 text-sm">
          {isSignup ? "Already have an account?" : "Don’t have an account?"}{" "}
          <span
            onClick={() => setIsSignup(!isSignup)}
            className="text-blue-600 cursor-pointer hover:underline"
          >
            {isSignup ? "Log In" : "Sign Up"}
          </span>
        </p>
      </form>
    </div>
  );
}
