import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, MessageCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }

    setError("");

    // A real password-reset email requires a backend.
    setSubmitted(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg sm:p-10">
        <Link
          to="/login"
          className="mb-8 flex items-center justify-center gap-3"
        >
          <span className="rounded-xl bg-indigo-600 p-3 text-white">
            <MessageCircle size={25} />
          </span>

          <span className="text-2xl font-bold text-slate-900">
            Smart Community
          </span>
        </Link>

        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
          <Mail size={27} />
        </div>

        {!submitted ? (
          <>
            <div className="mb-7 text-center">
              <h1 className="text-3xl font-bold text-slate-900">
                Forgot password?
              </h1>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Enter your email address to request a password reset link.
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
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  className={`w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 ${
                    error
                      ? "border-red-500 focus:ring-red-100"
                      : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-100"
                  }`}
                />

                {error && (
                  <p role="alert" className="mt-1 text-sm text-red-600">
                    {error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-700"
              >
                Send Reset Link
              </button>
            </form>
          </>
        ) : (
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900">
              Request submitted
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              The form is valid. Password-reset email delivery will work once
              the authentication backend is connected.
            </p>
          </div>
        )}

        <Link
          to="/login"
          className="mt-7 flex items-center justify-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          <ArrowLeft size={16} />
          Back to Login
        </Link>
      </section>
    </main>
  );
}