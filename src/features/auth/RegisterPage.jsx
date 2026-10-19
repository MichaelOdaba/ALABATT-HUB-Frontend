import { Eye, EyeOff, MoveRight } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth.js";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const form = new FormData(event.currentTarget);
    const password = form.get("password");
    const confirmPassword = form.get("confirmPassword");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setIsSubmitting(false);
      return;
    }

    try {
      await register({
        username: form.get("username").trim(),
        email: form.get("email").trim(),
        password,
        first_name: form.get("first_name").trim(),
        last_name: form.get("last_name").trim(),
        category: form.get("category"),
      });
      navigate("/login", {
        replace: true,
        state: { notice: "Your account is ready. Sign in to continue." },
      });
    } catch (requestError) {
      setError(requestError.message || "Unable to create your account.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      className="auth-form-wrap auth-register-wrap"
      aria-labelledby="register-heading"
    >
      <span className="auth-form-eyebrow">JOIN ALABATT</span>
      <h2 className="auth-form-title" id="register-heading">
        Create your account
      </h2>
      <p className="auth-form-intro">A few details to get you started.</p>

      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}

      <form className="auth-form auth-register-form" onSubmit={handleSubmit}>
        <div className="auth-field-row">
          <label className="auth-field">
            <span>First name</span>
            <input autoComplete="given-name" name="first_name" required />
          </label>
          <label className="auth-field">
            <span>Last name</span>
            <input autoComplete="family-name" name="last_name" required />
          </label>
        </div>
        <label className="auth-field">
          <span>Username</span>
          <input autoComplete="username" name="username" required />
        </label>
        <label className="auth-field">
          <span>Email</span>
          <input autoComplete="email" name="email" required type="email" />
        </label>
        <label className="auth-field">
          <span>Membership category</span>
          <select defaultValue="student" name="category">
            <option value="student">Student</option>
            <option value="staff">Staff</option>
            <option value="external">External</option>
          </select>
        </label>
        <label className="auth-field">
          <span>Password</span>
          <span className="auth-password-control">
            <input
              autoComplete="new-password"
              minLength={8}
              name="password"
              required
              type={showPassword ? "text" : "password"}
            />
            <button
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="auth-password-toggle"
              onClick={() => setShowPassword((visible) => !visible)}
              type="button"
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </span>
        </label>
        <label className="auth-field">
          <span>Confirm password</span>
          <input
            autoComplete="new-password"
            minLength={8}
            name="confirmPassword"
            required
            type="password"
          />
        </label>

        <button className="auth-submit" disabled={isSubmitting} type="submit">
          <span>{isSubmitting ? "Creating account..." : "Create account"}</span>
          {!isSubmitting && <MoveRight size={17} aria-hidden="true" />}
        </button>
      </form>

      <p className="auth-switch">
        Already registered? <Link to="/login">Sign in</Link>
      </p>
    </section>
  );
}
