import { Eye, EyeOff, MoveRight } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth.js";

export default function LoginPage() {
  const { login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const notice = location.state?.notice;

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login({ username: username.trim(), password });
      const destination = location.state?.from;
      const safeDestination =
        typeof destination === "string" &&
        destination.startsWith("/") &&
        !destination.startsWith("//")
          ? destination
          : "/dashboard";
      navigate(safeDestination, { replace: true });
    } catch (requestError) {
      setError(requestError.message || "Unable to sign in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-form-wrap" aria-labelledby="login-heading">
      <span className="auth-form-eyebrow">MEMBER ACCESS</span>
      <h2 className="auth-form-title" id="login-heading">
        Welcome back
      </h2>
      <p className="auth-form-intro">
        Sign in to continue to your ALABATT account.
      </p>

      {notice && (
        <p className="auth-notice" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="auth-field">
          <span>Username or email</span>
          <input
            autoComplete="username"
            name="username"
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Enter your username or email"
            required
            type="text"
            value={username}
          />
        </label>

        <label className="auth-field">
          <span>Password</span>
          <span className="auth-password-control">
            <input
              autoComplete="current-password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
              type={showPassword ? "text" : "password"}
              value={password}
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

        <button className="auth-submit" disabled={isSubmitting} type="submit">
          <span>{isSubmitting ? "Signing in..." : "Sign in"}</span>
          {!isSubmitting && <MoveRight size={17} aria-hidden="true" />}
        </button>
      </form>

      <p className="auth-switch">
        New to ALABATT? <Link to="/register">Create an account</Link>
      </p>
    </section>
  );
}
