import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";
import logo from "../assets/official-martlet_favicon.webp";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [status, setStatus] = useState({ type: "idle", message: "" });

  const onChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: "loading", message: "Signing in..." });
    try {
      const data = await login({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });
      setStatus({ type: "success", message: "Logged in." });
      if (data.user?.role === "senior") navigate("/senior/home");
      else if (data.user?.role === "admin") navigate("/admin");
      else navigate("/student/home");
    } catch (error) {
      const apiMessage =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "Could not log in.";
      setStatus({ type: "error", message: apiMessage });
    }
  };

  return (
    <section className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <img src={logo} alt="MarletMeets logo" />
          <div>
            <h2>MarletMeets</h2>
            <p>Welcome back. Log in to continue.</p>
          </div>
        </div>
        <form onSubmit={onSubmit} className="auth-form">
          <label>
            Email
            <input
              name="email"
              value={formData.email}
              onChange={onChange}
              autoComplete="off"
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              value={formData.password}
              onChange={onChange}
              autoComplete="off"
            />
          </label>
          <button className="btn-primary" type="submit">
            Log In
          </button>
        </form>
        {status.message && <div className={`status ${status.type}`}>{status.message}</div>}
        <p className="auth-switch">
          Need an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </section>
  );
}

export default Login;
