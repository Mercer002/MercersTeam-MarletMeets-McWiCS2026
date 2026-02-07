import React from "react";
import DashboardMap from "./DashboardMap";

function Dashboard() {
  return (
    <section style={{ padding: "20px" }}>
      <h2 style={{ marginBottom: "10px" }}>Live Dashboard</h2>
      <p style={{ marginBottom: "20px", color: "#666" }}>
        Real-time view of Students (Blue), Seniors (Red), and Active Matches
        (Green).
      </p>

      <div
        style={{
          border: "2px solid #ddd",
          borderRadius: "15px",
          overflow: "hidden",
        }}
      >
        <DashboardMap />
      </div>
    </section>
  );
}

export default Dashboard;
