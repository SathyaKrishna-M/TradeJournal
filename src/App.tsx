// src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import { useAuth } from "./context/AuthContext";
import Index from "./pages/Index";

function App() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* If logged in → go to dashboard */}
      <Route
        path="/"
        element={user ? <Navigate to="/dashboard" /> : <AuthPage />}
      />

      {/* Login and Signup */}
      <Route path="/login" element={<AuthPage />} />
      <Route path="/signup" element={<AuthPage />} />

      {/* Dashboard */}
      <Route
        path="/dashboard"
        element={user ? <Index /> : <Navigate to="/login" />}
      />

      {/* Fallback for invalid URLs */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
