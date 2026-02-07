import { useMemo, useState } from "react";
import { createSenior } from "../services/api";

const NEEDS = ["tech_help", "groceries", "transport", "companionship", "household_help"];
const LANGUAGES = ["English", "French", "Mandarin", "Arabic", "Spanish"];

function SeniorSignup() {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    address: "",
    needs: [],
    language: "",
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ type: "idle", message: "" });

  const hasErrors = useMemo(() => Object.keys(errors).length > 0, [errors]);

  const onChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleNeed = (need) => {
    setFormData((prev) => {
      const nextNeeds = prev.needs.includes(need)
        ? prev.needs.filter((item) => item !== need)
        : [...prev.needs, need];

      return { ...prev, needs: nextNeeds };
    });
  };

  const validate = () => {
    const nextErrors = {};

    if (!formData.first_name.trim()) nextErrors.first_name = "First name is required.";
    if (!formData.last_name.trim()) nextErrors.last_name = "Last name is required.";
    if (!formData.phone.trim()) nextErrors.phone = "Phone is required.";
    if (!formData.address.trim()) nextErrors.address = "Address is required.";
    if (formData.needs.length === 0) nextErrors.needs = "Select at least one need.";
    if (!formData.language) nextErrors.language = "Select a preferred language.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
      phone: "",
      address: "",
      needs: [],
      language: "",
    });
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: "idle", message: "" });

    if (!validate()) return;

    try {
      const payload = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        needs: formData.needs,
        language: formData.language,
      };

      const response = await createSenior(payload);
      setStatus({
        type: "success",
        message: `Senior registered${response.senior_id ? ` (ID: ${response.senior_id})` : ""}.`,
      });
      setErrors({});
      resetForm();
    } catch (error) {
      const apiMessage =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        "Could not register senior. Please try again.";
      setStatus({ type: "error", message: apiMessage });
    }
  };

  return (
    <section className="container py-4">
      <div className="row justify-content-center">
        <div className="col-12 col-lg-8">
          <div className="card shadow-sm">
            <div className="card-body p-4">
              <h2 className="h4 mb-3">Senior Signup</h2>
              <p className="text-muted mb-4">
                Register a senior profile for matching and session support.
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
                    <label htmlFor="language" className="form-label">
                      Preferred Language *
                    </label>
                    <select
                      id="language"
                      name="language"
                      className={`form-select ${errors.language ? "is-invalid" : ""}`}
                      value={formData.language}
                      onChange={onChange}
                    >
                      <option value="">Select one</option>
                      {LANGUAGES.map((language) => (
                        <option key={language} value={language}>
                          {language}
                        </option>
                      ))}
                    </select>
                    {errors.language && <div className="invalid-feedback">{errors.language}</div>}
                  </div>

                  <div className="col-12">
                    <label htmlFor="address" className="form-label">
                      Address *
                    </label>
                    <input
                      id="address"
                      name="address"
                      className={`form-control ${errors.address ? "is-invalid" : ""}`}
                      value={formData.address}
                      onChange={onChange}
                    />
                    {errors.address && <div className="invalid-feedback">{errors.address}</div>}
                  </div>

                  <div className="col-12">
                    <label className="form-label">Needs *</label>
                    <div className="d-flex flex-wrap gap-3">
                      {NEEDS.map((need) => (
                        <div className="form-check" key={need}>
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={`need-${need}`}
                            checked={formData.needs.includes(need)}
                            onChange={() => toggleNeed(need)}
                          />
                          <label className="form-check-label" htmlFor={`need-${need}`}>
                            {need.replace("_", " ")}
                          </label>
                        </div>
                      ))}
                    </div>
                    {errors.needs && <div className="text-danger small mt-1">{errors.needs}</div>}
                  </div>
                </div>

                <div className="d-flex align-items-center gap-3 mt-4">
                  <button className="btn btn-primary" type="submit">
                    Register Senior
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

export default SeniorSignup;
