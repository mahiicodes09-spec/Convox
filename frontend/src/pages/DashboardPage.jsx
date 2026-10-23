import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import api from "../services/api";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    const refreshToken = localStorage.getItem("refreshToken");
    let logoutError = "";

    try {
      if (!refreshToken) {
        throw new Error("No refresh token is available to invalidate.");
      }

      await api.post("/auth/logout/", { refresh: refreshToken });
    } catch {
      logoutError =
        "The server could not confirm logout. You have been signed out on this device.";
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      navigate("/login", {
        replace: true,
        state: logoutError ? { logoutError } : undefined,
      });
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-lg sm:p-10">
        <div className="mb-8 flex items-center justify-center gap-3">
          <span className="rounded-xl bg-indigo-600 p-3 text-white">
            <MessageCircle size={25} />
          </span>
          <span className="text-2xl font-bold text-slate-900">
            Smart Community
          </span>
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900">
            Welcome to your community
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            You are signed in. Your community dashboard will be available here.
          </p>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="mt-8 rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700"
          >
            {isLoggingOut ? "Logging out..." : "Log out"}
          </button>
        </div>
      </section>
    </main>
  );
}
