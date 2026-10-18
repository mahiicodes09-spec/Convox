import GoogleAuthButton from "../components/GoogleAuthButton";
import { useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Eye, EyeOff } from "lucide-react";

// Reusable password input component
function PasswordField({
  name,
  label,
  value,
  visible,
  toggle,
  error,
  onChange,
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-medium text-slate-700"
      >
        {label}
      </label>

      <div className="relative">
        <input
          id={name}
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={label}
          autoComplete="new-password"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${name}-error` : undefined}
          className={`w-full rounded-lg border px-4 py-3 pr-12 outline-none transition focus:ring-2 ${
            error
              ? "border-red-500 focus:border-red-500 focus:ring-red-100"
              : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-100"
          }`}
          required
        />

        <button
          type="button"
          onClick={toggle}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-600"
        >
          {visible ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>
      </div>

      {error && (
        <p
          id={`${name}-error`}
          role="alert"
          className="mt-1 text-sm text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
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

    setSuccess("");
  }

  // Validate the form
  function validateForm() {
    const newErrors = {};

    // Name validation
    const trimmedName = form.name.trim();

    if (!trimmedName) {
      newErrors.name = "Full name is required.";
    } else if (trimmedName.length < 2) {
      newErrors.name = "Name must contain at least 2 characters.";
    } else if (trimmedName.length > 60) {
      newErrors.name = "Name cannot exceed 60 characters.";
    } else if (
      !/^[\p{L}\p{M}]+(?:[ .'-][\p{L}\p{M}]+)*\.?$/u.test(
        trimmedName
      )
    ) {
      newErrors.name =
        "Enter a valid name using letters and normal name punctuation.";
    }

    // Email validation
    const email = form.email.trim();

    const emailPattern =
      /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/;

    if (!email) {
      newErrors.email = "Email address is required.";
    } else if (email.length > 254) {
      newErrors.email = "Email address is too long.";
    } else if (!emailPattern.test(email)) {
      newErrors.email =
        "Enter a valid email address, such as name@example.com.";
    }

    // Password validation
    if (!form.password) {
      newErrors.password = "Password is required.";
    } else if (form.password.length < 8) {
      newErrors.password =
        "Password must contain at least 8 characters.";
    } else if (!/[A-Z]/.test(form.password)) {
      newErrors.password =
        "Include at least one uppercase letter.";
    } else if (!/[a-z]/.test(form.password)) {
      newErrors.password =
        "Include at least one lowercase letter.";
    } else if (!/[0-9]/.test(form.password)) {
      newErrors.password = "Include at least one number.";
    } else if (!/[^A-Za-z0-9]/.test(form.password)) {
      newErrors.password =
        "Include at least one special character.";
    }

    // Confirm password
    if (!form.confirmPassword) {
      newErrors.confirmPassword =
        "Please confirm your password.";
    } else if (form.confirmPassword !== form.password) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  }

  // Submit form
  function handleSubmit(e) {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Backend registration and email verification
    // will be integrated later.
    setSuccess(
      "All fields are valid! Account creation and email verification are not connected yet."
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg sm:p-10">
        {/* Logo */}
        <Link
          to="/login"
          className="mb-7 flex items-center justify-center gap-3"
        >
          <span className="rounded-xl bg-indigo-600 p-3 text-white">
            <MessageCircle size={25} />
          </span>

          <span className="text-2xl font-bold text-slate-900">
            Smart Community
          </span>
        </Link>

        {/* Heading */}
        <div className="mb-7 text-center">
          <h1 className="text-3xl font-bold text-slate-900">
            Create an account
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Join your community and start connecting.
          </p>
        </div>

        {/* Success message */}
        {success && (
          <p
            role="status"
            className="mb-5 rounded-lg bg-green-50 p-3 text-sm text-green-700"
          >
            {success}
          </p>
        )}

        {/* Registration form */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="space-y-5"
        >
          {/* Full name */}
          <div>
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Full name
            </label>

            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              autoComplete="name"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={
                errors.name ? "name-error" : undefined
              }
              className={`w-full rounded-lg border px-4 py-3 outline-none transition focus:ring-2 ${
                errors.name
                  ? "border-red-500 focus:border-red-500 focus:ring-red-100"
                  : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-100"
              }`}
              required
            />

            {errors.name && (
              <p
                id="name-error"
                role="alert"
                className="mt-1 text-sm text-red-600"
              >
                {errors.name}
              </p>
            )}
          </div>

          {/* Email address */}
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
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
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
          <PasswordField
            name="password"
            label="Password"
            value={form.password}
            visible={showPassword}
            toggle={() =>
              setShowPassword((prev) => !prev)
            }
            error={errors.password}
            onChange={handleChange}
          />

          {/* Confirm password */}
          <PasswordField
            name="confirmPassword"
            label="Confirm password"
            value={form.confirmPassword}
            visible={showConfirmPassword}
            toggle={() =>
              setShowConfirmPassword((prev) => !prev)
            }
            error={errors.confirmPassword}
            onChange={handleChange}
          />

          {/* Submit button */}
          <button
  type="submit"
  className="w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
>
  Create Account
</button>

{/* Divider */}
<div className="relative py-2">
  <div className="absolute inset-0 flex items-center">
    <div className="w-full border-t border-slate-200" />
  </div>

  <div className="relative flex justify-center">
    <span className="bg-white px-3 text-xs font-medium uppercase tracking-wider text-slate-400">
      Or sign up with
    </span>
  </div>
</div>

{/* Google Sign-Up */}
<GoogleAuthButton text="Sign up with Google" />
        </form>

        {/* Login link */}
        <p className="mt-7 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Log in
          </Link>
        </p>

        {/* Footer */}
        <p className="mt-6 text-center text-xs leading-5 text-slate-400">
          By creating an account, you agree to our Terms of Service
          and Privacy Policy.
        </p>
      </section>
    </main>
  );
}