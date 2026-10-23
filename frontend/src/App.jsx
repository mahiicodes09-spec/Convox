import { useEffect, useState } from "react";
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

function ProtectedRoute({ children }) {
  const accessToken = localStorage.getItem("accessToken");
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    if (!accessToken) {
      setStatus("unauthenticated");
      return;
    }

    let active = true;

    api
      .get("/auth/me/")
      .then(() => {
        if (active) {
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

  return children;
}

export default function App() {
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
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
