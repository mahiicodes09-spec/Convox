import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import api from "../services/api";

export default function VerifyEmailPage() {
const location = useLocation();
const navigate = useNavigate();

const [email, setEmail] = useState(location.state?.email || "");
const [otp, setOtp] = useState("");
const [loading, setLoading] = useState(false);
const [resending, setResending] = useState(false);
const [resendCooldown, setResendCooldown] = useState(0);
const [error, setError] = useState("");
const [success, setSuccess] = useState("");

useEffect(() => {
  if (resendCooldown <= 0) {
    return undefined;
  }

  const timer = setTimeout(() => {
    setResendCooldown((remaining) => Math.max(remaining - 1, 0));
  }, 1000);

  return () => clearTimeout(timer);
}, [resendCooldown]);

async function handleResend() {
  if (resending || resendCooldown > 0) {
    return;
  }

  setError("");
  setSuccess("");

  if (!email.trim()) {
    setError("Please enter your email address.");
    return;
  }

  setResending(true);

  try {
    await api.post("/auth/resend-verification/", { email: email.trim() });
    setSuccess("A new OTP has been sent to your email address.");
    setResendCooldown(60);
  } catch (err) {
    const data = err.response?.data;
    const message =
      data?.detail ||
      data?.message ||
      data?.email?.[0] ||
      "Unable to resend the OTP. Please try again.";

    setError(
      typeof message === "string"
        ? message
        : "Unable to resend the OTP. Please try again."
    );
  } finally {
    setResending(false);
  }
}

async function handleSubmit(e) {
e.preventDefault();
setError("");
setSuccess("");
if (!email.trim() || !otp.trim()) {
  setError("Please enter your email address and OTP.");
  return;
}
if (otp.trim().length !== 6) {
  setError("The OTP must contain exactly 6 characters.");
  return;
}

setLoading(true);

try {
  await api.post("/auth/verify-email/", {
    email: email.trim(),
    otp: otp.trim(),
  });

  setSuccess("Email verified successfully!");

  setTimeout(() => {
    navigate("/login", { replace: true });
  }, 1000);
} catch (err) {
  const data = err.response?.data;
  const message =
    data?.detail ||
    data?.message ||
    data?.otp?.[0] ||
    data?.email?.[0] ||
    "Email verification failed. Please check your OTP and try again.";

  setError(
    typeof message === "string"
      ? message
      : "Email verification failed. Please try again."
  );
} finally {
  setLoading(false);
}
}
return (
<main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
<section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg sm:p-10">
<Link to="/login" className="mb-8 flex items-center justify-center gap-3" >
<span className="rounded-xl bg-indigo-600 p-3 text-white">
<MessageCircle size={25} />
</span>
      <span className="text-2xl font-bold text-slate-900">
        Smart Community
      </span>
    </Link>

    <div className="mb-7 text-center">
      <h1 className="text-3xl font-bold text-slate-900">
        Verify your email
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Enter the OTP sent to your email address.
      </p>
    </div>

    {error && (
      <p role="alert" className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
        {error}
      </p>
    )}

    {success && (
      <p role="status" className="mb-5 rounded-lg bg-green-50 p-3 text-sm text-green-700">
        {success}
      </p>
    )}

    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
          Email address
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      <div>
        <label htmlFor="otp" className="mb-2 block text-sm font-medium text-slate-700">
          Email OTP
        </label>
        <input
          id="otp"
          type="text"
          maxLength={6}
          inputMode="numeric"
          autoComplete="one-time-code"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          placeholder="Enter your OTP"
          required
          className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Verifying..." : "Verify Email"}
      </button>
    </form>

    <button
      type="button"
      onClick={handleResend}
      disabled={resending || resendCooldown > 0}
      className="mt-5 w-full rounded-lg border border-indigo-600 py-3 font-semibold text-indigo-600 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {resending
        ? "Sending..."
        : resendCooldown > 0
          ? `Resend OTP (${resendCooldown}s)`
          : "Resend OTP"}
    </button>

    <p className="mt-6 text-center text-sm text-slate-600">
      Already verified?{" "}
      <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">
        Log in
      </Link>
    </p>
  </section>
</main>
);
}