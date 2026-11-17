import { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import ReCAPTCHA from "react-google-recaptcha";
import api from "../services/api";
import yappyHeading from "../assets/images/yappyheading.svg";
import yappyLogo from "../assets/images/yappy-logo.svg";
import loginCharacter from "../assets/images/loginch.svg";
import AuthPageBackground from "../components/AuthPageBackground";
import CursorStarTrail from "../components/CursorStarTrail";
import "./LoginPage.css";

export default function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const recaptchaRef = useRef(null);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaError, setCaptchaError] = useState("");

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  // Handle input changes
  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
      form: "",
    }));

    setSuccessMessage("");
  }

  // Validate email
  function validateEmail(email) {
  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    return "Email address is required.";
  }

  if (trimmedEmail.length > 254) {
    return "Email address is too long.";
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(trimmedEmail)) {
    return "Enter a valid email address.";
  }

  return "";
}

  // Validate password
  function validatePassword(password) {
    if (!password) {
      return "Password is required.";
    }

    if (password.length < 8) {
      return "Password must contain at least 8 characters.";
    }

    return "";
  }

  // Validate login form
  function validateForm() {
    const newErrors = {};

    const emailError = validateEmail(form.email);
    const passwordError = validatePassword(form.password);

    if (emailError) {
      newErrors.email = emailError;
    }

    if (passwordError) {
      newErrors.password = passwordError;
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  }

  // Handle login submission
  async function handleSubmit(e) {
  e.preventDefault();
  setSuccessMessage("");

  if (!validateForm()) {
    return;
  }

  if (!captchaToken) {
    setCaptchaError("Please complete the reCAPTCHA checkbox.");
    return;
  }

  setLoading(true);
  setErrors({});
  setCaptchaError("");

  try {
    const response = await api.post("/auth/login/", {
      email: form.email.trim(),
      password: form.password,
      captcha_token: captchaToken,
    });

    const accessToken = response.data.access;
    const refreshToken = response.data.refresh;

    if (!accessToken || !refreshToken) {
      setErrors({
        form: "Login response did not contain the expected tokens.",
      });
      return;
    }

    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);

    setSuccessMessage("Login successful!");
    navigate("/dashboard", { replace: true });
 
  } catch (err) {
    const data = err.response?.data;
    const backendMessage =
      data?.detail || data?.message || data?.non_field_errors?.[0];
    const isCaptchaError =
      Boolean(data?.captcha_token || data?.captcha || data?.recaptcha) ||
      (typeof backendMessage === "string" &&
        /captcha|recaptcha/i.test(backendMessage));

    const message =
      backendMessage ||
      data?.email?.[0] ||
      "Unable to sign in. Please check your credentials and try again.";

    if (isCaptchaError) {
      setCaptchaError(
        "reCAPTCHA verification failed. Please complete it again and retry.",
      );
    } else {
      setErrors({ form: message });
    }
  } finally {
    setLoading(false);
    setCaptchaToken("");
    recaptchaRef.current?.reset();
  }
}
  return (
  <main className="auth-page relative isolate flex min-h-screen items-center justify-center bg-[#080808] px-4 py-10 sm:px-6">
    <AuthPageBackground
      character={loginCharacter}
      characterClassName="login-character"
    />

    <section className="auth-card relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-2xl shadow-black/30 sm:p-10">

      {/* Brand */}
      <Link
        to="/login"
        className="mb-8 flex items-center justify-center gap-3"
      >
        <img src={yappyLogo} alt="" className="yappy-mark" />
        <img
          src={yappyHeading}
          alt="Yappy"
          className="h-auto w-[104px] sm:w-[112px]"
        />
      </Link>

        {/* Heading */}
        <div className="mb-7 text-center">
          <h1 className="text-3xl font-bold text-slate-900">
            Welcome back
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Sign in to connect with your community.
          </p>
        </div>

        {/* General error */}
        {location.state?.logoutError && (
          <div
            role="alert"
            className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {location.state.logoutError}
          </div>
        )}

        {errors.form && (
          <div
            role="alert"
            className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {errors.form}
          </div>
        )}

        {/* Success message */}
        {successMessage && (
          <div
            role="status"
            className="mb-5 rounded-lg bg-green-50 p-3 text-sm text-green-700"
          >
            {successMessage}
          </div>
        )}

        {/* Login form */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="space-y-5"
        >
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Email address
            </label>

            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={
                errors.email ? "email-error" : undefined
              }
              className={`w-full rounded-lg border px-4 py-3 outline-none transition focus:ring-2 ${
                errors.email
                  ? "border-red-500 focus:border-red-500 focus:ring-red-100"
                  : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-100"
              }`}
              required
            />

            {errors.email && (
              <p
                id="email-error"
                role="alert"
                className="mt-1 text-sm text-red-600"
              >
                {errors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="password"
                className="text-sm font-medium text-slate-700"
              >
                Password
              </label>

              <Link
                to="/forgot-password"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                Forgot password?
              </Link>
            </div>

            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={
                  errors.password ? "password-error" : undefined
                }
                className={`w-full rounded-lg border px-4 py-3 pr-12 outline-none transition focus:ring-2 ${
                  errors.password
                    ? "border-red-500 focus:border-red-500 focus:ring-red-100"
                    : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-100"
                }`}
                required
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword((prev) => !prev)
                }
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-600"
              >
                {showPassword ? (
                  <EyeOff size={19} />
                ) : (
                  <Eye size={19} />
                )}
              </button>
            </div>

            {errors.password && (
              <p
                id="password-error"
                role="alert"
                className="mt-1 text-sm text-red-600"
              >
                {errors.password}
              </p>
            )}
          </div>

          <div className="max-w-full overflow-x-auto">
            <div className="flex justify-center">
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                onChange={(token) => {
                  setCaptchaToken(token || "");
                  if (token) setCaptchaError("");
                }}
                onExpired={() => {
                  setCaptchaToken("");
                  setCaptchaError("reCAPTCHA expired. Please complete it again.");
                  recaptchaRef.current?.reset();
                }}
              />
            </div>
            {captchaError && (
              <p role="alert" className="mt-2 text-center text-sm text-red-600">
                {captchaError}
              </p>
            )}
            {!captchaError && !captchaToken && (
              <p className="mt-2 text-center text-sm text-slate-500">
                Complete reCAPTCHA to enable login.
              </p>
            )}
          </div>

          {/* Login button */}
          <button
            type="submit"
            disabled={loading || !captchaToken}
            className="w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Please wait..." : "Log In"}
          </button>
        </form>


        {/* Sign-up link */}
        <p className="mt-7 text-center text-sm text-slate-600">
          Don't have an account?{" "}
          <Link
            to="/signup"
            className="font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Sign up
          </Link>
        </p>

        {/* Footer */}
        <p className="mt-6 text-center text-xs leading-5 text-slate-400">
          By continuing, you agree to our Terms of Service and
          Privacy Policy.
        </p>
      </section>
      <CursorStarTrail />
    </main>
  );
}