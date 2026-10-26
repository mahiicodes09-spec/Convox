import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import api from "./services/api";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import DashboardPage from "./pages/DashboardPage";
import CommunityWorkspacePage from "./pages/CommunityWorkspacePage";

/**
 * Checks the saved access token before showing protected content.
 * GET /auth/me/ also supplies the backend profile that the dashboard needs.
 */
function ProtectedRoute({ children }) {
  const accessToken = localStorage.getItem("accessToken");
  // Derive the first screen from storage instead of setting state in the effect.
  const [status, setStatus] = useState(() =>
    accessToken ? "checking" : "unauthenticated",
  );
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let active = true;

    // The existing Axios client adds Authorization: Bearer <accessToken>.
    api
      .get("/auth/me/")
      .then((response) => {
        if (active) {
          // The profile is passed down so the dashboard does not repeat this request.
          setProfile(response.data);
          setStatus("authenticated");
        }
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        if (error.response?.status === 401 || error.response?.status === 403) {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          setStatus("unauthenticated");
          return;
        }

        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [accessToken]);

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  if (status === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
        <p role="alert" className="text-sm text-red-700">
          Unable to verify your session. Please try again.
        </p>
      </main>
    );
  }

  if (status !== "authenticated") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
        <p className="text-sm text-slate-500">Checking your session...</p>
      </main>
    );
  }

  return typeof children === "function" ? children(profile) : children;
}

export default function App() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "light",
  );

  useEffect(() => {
    const selectedTheme = theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = selectedTheme;
    localStorage.setItem("theme", selectedTheme);
  }, [theme]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="/forgot-password"
          element={<ForgotPasswordPage />}
        />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              {(profile) => <DashboardPage profile={profile} />}
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/communities/:serverId"
          element={
            <ProtectedRoute>
              {(profile) => <CommunityWorkspacePage profile={profile} />}
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      <button
        type="button"
        className="theme-toggle"
        onClick={() =>
          setTheme((currentTheme) =>
            currentTheme === "dark" ? "light" : "dark",
          )
        }
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      >
        {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        <span>{theme === "dark" ? "Light" : "Dark"}</span>
      </button>
    </BrowserRouter>
  );
}
