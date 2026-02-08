import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AddressAutocomplete from "../components/AddressAutocomplete";
import { useAuth } from "../components/AuthProvider";

function StudentSignup() {
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

  const navigate = useNavigate();
  const { signup } = useAuth();

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

      await signup("student", payload);
      setStatus({ type: "success", message: "Student account created." });
      setErrors({});
      resetForm();
      navigate("/student/home");
    } catch (error) {
      const apiMessage =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        "Could not register student. Please try again.";
      setStatus({ type: "error", message: apiMessage });
    }
  };

  return (
    <section className="container py-4">
      <div className="row justify-content-center">
        <div className="col-12 col-lg-8">
          <div className="card shadow-sm">
            <div className="card-body p-4">
              <h2 className="h4 mb-3">Student Signup</h2>
              <p className="text-muted mb-4">
                Register a McGill student volunteer profile for matching.
              </p>

              <form onSubmit={onSubmit} noValidate>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label htmlFor="first_name" className="form-label">
                      First Name *
                    </label>
                    <input
                      id="first_name"
                      name="first_name"
                      className={`form-control ${errors.first_name ? "is-invalid" : ""}`}
                      value={formData.first_name}
                      onChange={onChange}
                    />
                    {errors.first_name && <div className="invalid-feedback">{errors.first_name}</div>}
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="last_name" className="form-label">
                      Last Name *
                    </label>
                    <input
                      id="last_name"
                      name="last_name"
                      className={`form-control ${errors.last_name ? "is-invalid" : ""}`}
                      value={formData.last_name}
                      onChange={onChange}
                    />
                    {errors.last_name && <div className="invalid-feedback">{errors.last_name}</div>}
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="email" className="form-label">
                      Email *
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      className={`form-control ${errors.email ? "is-invalid" : ""}`}
                      value={formData.email}
                      onChange={onChange}
                    />
                    {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="phone" className="form-label">
                      Phone *
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      className={`form-control ${errors.phone ? "is-invalid" : ""}`}
                      value={formData.phone}
                      onChange={onChange}
                    />
                    {errors.phone && <div className="invalid-feedback">{errors.phone}</div>}
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="password" className="form-label">
                      Password *
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      className={`form-control ${errors.password ? "is-invalid" : ""}`}
                      value={formData.password}
                      onChange={onChange}
                    />
                    {errors.password && <div className="invalid-feedback">{errors.password}</div>}
                  </div>

                  <div className="col-12">
                    <label htmlFor="address" className="form-label">
                      Address *
                    </label>
                    <AddressAutocomplete
                      id="address"
                      name="address"
                      className={`form-control ${errors.address ? "is-invalid" : ""}`}
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
                    {errors.address && <div className="invalid-feedback">{errors.address}</div>}
                  </div>

                </div>

                <div className="d-flex align-items-center gap-3 mt-4">
                  <button className="btn btn-primary" type="submit">
                    Register Student
                  </button>
                  {status.message && (
                    <span className={status.type === "success" ? "text-success" : "text-danger"}>
                      {status.message}
                    </span>
                  )}
                </div>
              </form>

              {hasErrors && status.type !== "success" && (
                <p className="text-danger small mt-3 mb-0">Please fix the validation errors above.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default StudentSignup;
