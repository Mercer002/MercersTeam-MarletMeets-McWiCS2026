import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AddressAutocomplete from "../components/AddressAutocomplete";
import { useAuth } from "../components/AuthProvider";
import logo from "../assets/official-martlet_favicon.webp";

function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [role, setRole] = useState("student");
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address: "",
    latitude: null,
    longitude: null,
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ type: "idle", message: "" });

  const hasErrors = useMemo(() => Object.keys(errors).length > 0, [errors]);

  const onChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const nextErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.first_name.trim()) nextErrors.first_name = "First name is required.";
    if (!formData.last_name.trim()) nextErrors.last_name = "Last name is required.";
    if (!formData.email.trim()) nextErrors.email = "Email is required.";
    if (formData.email && !emailRegex.test(formData.email)) nextErrors.email = "Enter a valid email.";
    if (!formData.phone.trim()) nextErrors.phone = "Phone is required.";
    if (!formData.address.trim()) nextErrors.address = "Address is required.";
    if (!formData.password.trim()) nextErrors.password = "Password is required.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      address: "",
      latitude: null,
      longitude: null,
      password: "",
    });
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: "idle", message: "" });

    if (!validate()) return;

    try {
      const payload = {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        latitude: formData.latitude,
        longitude: formData.longitude,
      };

      await signup(role, payload);
      setStatus({ type: "success", message: "Account created." });
      setErrors({});
      resetForm();
      navigate(role === "senior" ? "/senior/home" : "/student/home");
    } catch (error) {
      const apiMessage =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "Could not register. Please try again.";
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
            <p>Sign up to connect students and seniors.</p>
          </div>
        </div>

        <div className="role-toggle">
          <button
            type="button"
            className={role === "student" ? "role-toggle__btn active" : "role-toggle__btn"}
            onClick={() => setRole("student")}
          >
            Student
          </button>
          <button
            type="button"
            className={role === "senior" ? "role-toggle__btn active" : "role-toggle__btn"}
            onClick={() => setRole("senior")}
          >
            Senior
          </button>
        </div>

        <form onSubmit={onSubmit} noValidate className="auth-form">
          <div className="form-grid">
            <label>
              First Name *
              <input
                name="first_name"
                className={errors.first_name ? "is-invalid" : ""}
                value={formData.first_name}
                onChange={onChange}
              />
              {errors.first_name && <span className="field-error">{errors.first_name}</span>}
            </label>

            <label>
              Last Name *
              <input
                name="last_name"
                className={errors.last_name ? "is-invalid" : ""}
                value={formData.last_name}
                onChange={onChange}
              />
              {errors.last_name && <span className="field-error">{errors.last_name}</span>}
            </label>

            <label>
              Email *
              <input
                name="email"
                type="email"
                className={errors.email ? "is-invalid" : ""}
                value={formData.email}
                onChange={onChange}
                autoComplete="off"
              />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </label>

            <label>
              Phone *
              <input
                name="phone"
                className={errors.phone ? "is-invalid" : ""}
                value={formData.phone}
                onChange={onChange}
                autoComplete="off"
              />
              {errors.phone && <span className="field-error">{errors.phone}</span>}
            </label>

            <label className="full-width">
              Address *
              <AddressAutocomplete
                id="address"
                name="address"
                className={errors.address ? "is-invalid" : ""}
                value={formData.address}
                onChange={onChange}
                onSelect={(formatted, place) => {
                  const lat = place?.geometry?.location?.lat?.();
                  const lng = place?.geometry?.location?.lng?.();
                  setFormData((prev) => ({
                    ...prev,
                    address: formatted,
                    latitude: lat ?? prev.latitude,
                    longitude: lng ?? prev.longitude,
                  }));
                }}
                placeholder="Start typing an address"
                error={errors.address}
              />
              {errors.address && <span className="field-error">{errors.address}</span>}
            </label>

            <label className="full-width">
              Password *
              <input
                name="password"
                type="password"
                className={errors.password ? "is-invalid" : ""}
                value={formData.password}
                onChange={onChange}
                autoComplete="new-password"
              />
              {errors.password && <span className="field-error">{errors.password}</span>}
            </label>
          </div>

          <button className="btn-primary" type="submit">
            Sign Up
          </button>
        </form>

        {status.message && <div className={`status ${status.type}`}>{status.message}</div>}

        {hasErrors && status.type !== "success" && (
          <p className="field-error">Please fix the errors above.</p>
        )}

        <p className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </section>
  );
}

export default Signup;
