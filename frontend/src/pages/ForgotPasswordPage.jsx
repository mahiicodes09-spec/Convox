import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, MessageCircle, Eye, EyeOff } from "lucide-react";
import api from "../services/api";

export default function ForgotPasswordPage() {
const [email, setEmail] = useState("");
const [otp, setOtp] = useState("");
const [resetToken, setResetToken] = useState("");
const [password, setPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");

const [step, setStep] = useState(1);
const [error, setError] = useState("");
const [successMessage, setSuccessMessage] = useState("");
const [loading, setLoading] = useState(false);
const [showPassword, setShowPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);

function handleEmailChange(e) {
setEmail(e.target.value);
setError("");
setSuccessMessage("");
}

async function handleSubmit(e) {
e.preventDefault();
setError("");
setSuccessMessage("");


const trimmedEmail = email.trim();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (!emailPattern.test(trimmedEmail)) {
  setError("Enter a valid email address.");
  return;
}

setLoading(true);

try {
  await api.post("/auth/forgot-password/", {
    email: trimmedEmail,
  });

  setStep(2);
  setSuccessMessage("If the account is eligible, a reset OTP has been requested. Check your email.");
} catch (err) {
  const data = err.response?.data;

  setError(
    data?.detail ||
      data?.message ||
      data?.email?.[0] ||
      "Unable to request a reset OTP. Please try again."
  );
} finally {
  setLoading(false);
}


}

async function handleVerifyOtp(e) {
e.preventDefault();
setError("");
setSuccessMessage("");


if (!otp.trim()) {
  setError("Enter the OTP sent to your email.");
  return;
}

setLoading(true);

try {
  const response = await api.post("/auth/verify-reset-otp/", {
    email: email.trim(),
    otp: otp.trim(),
  });

  if (!response.data?.reset_token) {
    setError("OTP verification response did not contain a reset token.");
    return;
  }

  setResetToken(response.data.reset_token);
  setStep(3);
  setSuccessMessage("OTP verified. You can now set a new password.");
} catch (err) {
  const data = err.response?.data;

  setError(
    data?.detail ||
      data?.message ||
      data?.otp?.[0] ||
      "OTP verification failed. Check the code and try again."
  );
} finally {
  setLoading(false);
}


}

async function handleResetPassword(e) {
e.preventDefault();
setError("");
setSuccessMessage("");


if (password.length < 8) {
  setError("Password must contain at least 8 characters.");
  return;
}

if (password !== confirmPassword) {
  setError("Passwords do not match.");
  return;
}

setLoading(true);

try {
  await api.post("/auth/reset-password/", {
    email: email.trim(),
    reset_token: resetToken,
    new_password: password,
    new_password2: confirmPassword,
  });

  setStep(4);
  setPassword("");
  setConfirmPassword("");
  setOtp("");
  setResetToken("");
  setSuccessMessage("Your password has been reset successfully. You can now log in.");
} catch (err) {
  const data = err.response?.data;

  setError(
    data?.detail ||
      data?.message ||
      data?.new_password?.[0] ||
      data?.new_password2?.[0] ||
      "Unable to reset your password. Please try again."
  );
} finally {
  setLoading(false);
}


}

return ( <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10"> <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg sm:p-10"> <Link
       to="/login"
       className="mb-8 flex items-center justify-center gap-3"
     > <span className="rounded-xl bg-indigo-600 p-3 text-white"> <MessageCircle size={25} /> </span>


      <span className="text-2xl font-bold text-slate-900">
        Smart Community
      </span>
    </Link>

    <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
      <Mail size={27} />
    </div>

    {step === 1 && (
      <>
        <div className="mb-7 text-center">
          <h1 className="text-3xl font-bold text-slate-900">
            Forgot password?
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Enter your registered email address to request a password-reset OTP.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Email address
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="you@example.com"
              autoComplete="email"
              required
              aria-invalid={Boolean(error)}
              className={`w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 ${
                error
                  ? "border-red-500 focus:ring-red-100"
                  : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-100"
              }`}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send Reset OTP"}
          </button>
        </form>
      </>
    )}

    {step === 2 && (
      <>
        <div className="mb-7 text-center">
          <h1 className="text-3xl font-bold text-slate-900">
            Verify OTP
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Enter the reset OTP sent to {email.trim()}.
          </p>
        </div>

        <form onSubmit={handleVerifyOtp} noValidate className="space-y-5">
          <div>
            <label
              htmlFor="otp"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Reset OTP
            </label>

            <input
              id="otp"
              type="text"
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value);
                setError("");
              }}
              placeholder="Enter OTP"
              autoComplete="one-time-code"
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </button>

          <button
            type="button"
            onClick={() => {
              setStep(1);
              setOtp("");
              setError("");
              setSuccessMessage("");
            }}
            className="w-full text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Change email address
          </button>
        </form>
      </>
    )}

    {step === 3 && (
      <>
        <div className="mb-7 text-center">
          <h1 className="text-3xl font-bold text-slate-900">
            Set new password
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Choose a new password for your account.
          </p>
        </div>

        <form
          onSubmit={handleResetPassword}
          noValidate
          className="space-y-5"
        >
          <div>
            <label
              htmlFor="new-password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              New password
            </label>

            <div className="relative">
              <input
                id="new-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                autoComplete="new-password"
                placeholder="Enter new password"
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 pr-12 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Confirm new password
            </label>

            <div className="relative">
              <input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError("");
                }}
                autoComplete="new-password"
                placeholder="Confirm new password"
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 pr-12 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword((prev) => !prev)
                }
                aria-label={
                  showConfirmPassword
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
              >
                {showConfirmPassword ? (
                  <EyeOff size={19} />
                ) : (
                  <Eye size={19} />
                )}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Updating..." : "Reset Password"}
          </button>
        </form>
      </>
    )}

    {step === 4 && (
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">
          Password reset successful
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          Your password has been changed. You can now sign in with your new password.
        </p>

        <Link
          to="/login"
          className="mt-6 inline-block w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-700"
        >
          Back to Login
        </Link>
      </div>
    )}

    {successMessage && step !== 4 && (
      <p
        role="status"
        className="mt-5 rounded-lg bg-green-50 p-3 text-sm text-green-700"
      >
        {successMessage}
      </p>
    )}

    {error && step !== 1 && step !== 2 && step !== 3 && (
      <p role="alert" className="mt-5 text-sm text-red-600">
        {error}
      </p>
    )}

    {step !== 4 && (
      <Link
        to="/login"
        className="mt-7 flex items-center justify-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
      >
        <ArrowLeft size={16} />
        Back to Login
      </Link>
    )}
  </section>
</main>


);
}
