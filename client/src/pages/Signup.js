import { useState } from "react";
import { checkHealth } from "../services/api";

function Signup() {
  const [health, setHealth] = useState({ status: "idle", message: "" });

  const testConnection = async () => {
    setHealth({ status: "loading", message: "Checking backend..." });

    try {
      const data = await checkHealth();
      setHealth({ status: "success", message: data.status || "API is healthy." });
    } catch (error) {
      const msg = error?.response?.data?.error || error.message || "Could not reach backend.";
      setHealth({ status: "error", message: msg });
    }
  };

  return (
    <section>
      <h2>Signup</h2>
      <p>This page is reserved for student/senior signup forms in Ticket 2.x.</p>
      <button type="button" onClick={testConnection} disabled={health.status === "loading"}>
        {health.status === "loading" ? "Testing..." : "Test Flask API"}
      </button>
      {health.message && <p className={`status ${health.status}`}>{health.message}</p>}
    </section>
  );
}

export default Signup;
