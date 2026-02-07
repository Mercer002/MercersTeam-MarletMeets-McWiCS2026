import { useEffect, useMemo, useState } from "react";
import DashboardMap from "./DashboardMap";
import { fetchDashboard } from "../services/api";

function Dashboard() {
  const [data, setData] = useState({
    totals: null,
    recent_sessions: [],
    students: [],
    seniors: [],
  });
  const [status, setStatus] = useState({ type: "idle", message: "" });

  useEffect(() => {
    let active = true;
    const load = async () => {
      setStatus({ type: "loading", message: "Loading dashboard..." });
      try {
        const response = await fetchDashboard();
        if (!active) return;
        setData({
          totals: response.totals,
          recent_sessions: response.recent_sessions || [],
          students: response.students || [],
          seniors: response.seniors || [],
        });
        setStatus({ type: "success", message: "" });
      } catch (error) {
        if (!active) return;
        setStatus({
          type: "error",
          message: "Could not load dashboard data.",
        });
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const totalHours = useMemo(() => {
    if (!data.totals) return 0;
    const minutes = Number(data.totals.total_minutes || 0);
    return Math.round((minutes / 60) * 10) / 10;
  }, [data.totals]);

  return (
    <section className="dashboard">
      <div className="dashboard__header">
        <div>
          <h2>Dashboard</h2>
          <p className="dashboard__subtext">
            Live snapshot of volunteer activity and recent sessions.
          </p>
        </div>
        {status.message && (
          <div className={`status ${status.type}`}>{status.message}</div>
        )}
      </div>

      <div className="dashboard__stats">
        <div className="stat-card">
          <p>Total Students</p>
          <h3>{data.totals?.total_students ?? "—"}</h3>
        </div>
        <div className="stat-card">
          <p>Total Seniors</p>
          <h3>{data.totals?.total_seniors ?? "—"}</h3>
        </div>
        <div className="stat-card">
          <p>Total Sessions</p>
          <h3>{data.totals?.total_sessions ?? "—"}</h3>
        </div>
        <div className="stat-card">
          <p>Total Hours</p>
          <h3>{data.totals ? totalHours : "—"}</h3>
        </div>
      </div>

      <div className="dashboard__grid">
        <div className="dashboard__map">
          <DashboardMap students={data.students} seniors={data.seniors} />
        </div>
        <div className="dashboard__table">
          <h3>Recent Sessions</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Senior</th>
                  <th>Status</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_sessions.length === 0 ? (
                  <tr>
                    <td colSpan="4">No sessions yet.</td>
                  </tr>
                ) : (
                  data.recent_sessions.map((session) => (
                    <tr key={session.session_id}>
                      <td>
                        {session.student_first_name} {session.student_last_name}
                      </td>
                      <td>
                        {session.senior_first_name} {session.senior_last_name}
                      </td>
                      <td>{session.status}</td>
                      <td>{session.duration_minutes} min</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Dashboard;
