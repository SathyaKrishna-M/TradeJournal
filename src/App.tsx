// src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import Index from "./pages/Index";
import ProfilePage from "./pages/ProfilePage";
import { PrivateRoute } from "./components/PrivateRoute";
import { useAuth } from "./context/AuthContext";

function App() {
  const { currentUser } = useAuth();

  return (
    <Routes>
      {/* Default route: redirect based on login state */}
      <Route
        path="/"
        element={
          currentUser ? <Navigate to="/dashboard" replace /> : <AuthPage />
        }
      />

      {/* Auth routes */}
      <Route path="/login" element={<AuthPage />} />
      <Route path="/signup" element={<AuthPage />} />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Index />
          </PrivateRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <ProfilePage />
          </PrivateRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
