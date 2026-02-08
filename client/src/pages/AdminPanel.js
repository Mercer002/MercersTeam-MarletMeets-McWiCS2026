import { useEffect, useState } from "react";
import { createSession, fetchAdminOverview, getMatchesForSenior, listSeniors } from "../services/api";

function AdminPanel() {
  const [seniors, setSeniors] = useState([]);
  const [matchesBySenior, setMatchesBySenior] = useState({});
  const [loadingSeniorId, setLoadingSeniorId] = useState(null);
  const [statusBySenior, setStatusBySenior] = useState({});
  const [error, setError] = useState("");
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const overviewData = await fetchAdminOverview();
        if (!active) return;
        setOverview(overviewData);
        const data = await listSeniors();
        if (!active) return;
        setSeniors(data.seniors || []);
      } catch (err) {
        if (!active) return;
        setError("Could not load seniors.");
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const handleFindMatches = async (seniorId) => {
    setLoadingSeniorId(seniorId);
    setError("");
    setStatusBySenior((prev) => ({ ...prev, [seniorId]: "" }));
    try {
      const data = await getMatchesForSenior(seniorId);
      setMatchesBySenior((prev) => ({ ...prev, [seniorId]: data.matches || [] }));
    } catch (err) {
      setError("Could not fetch matches.");
    } finally {
      setLoadingSeniorId(null);
    }
  };

  const handleCreateSession = async (seniorId, studentId) => {
    setStatusBySenior((prev) => ({ ...prev, [seniorId]: "" }));
    try {
      const response = await createSession({ senior_id: seniorId, student_id: studentId });
      setStatusBySenior((prev) => ({
        ...prev,
        [seniorId]: `Session created (ID: ${response.session_id}).`,
      }));
    } catch (err) {
      setStatusBySenior((prev) => ({
        ...prev,
        [seniorId]: "Could not create session.",
      }));
    }
  };

  return (
    <section className="container">
      <h2>Admin Panel 🛠️</h2>
      <p>View all users, tasks, and manage matches manually.</p>

      {error && <div className="status error">{error}</div>}

      {overview && (
        <div className="dashboard__stats">
          <div className="stat-card">
            <p>Total Students</p>
            <h3>{overview.students?.length ?? 0}</h3>
          </div>
          <div className="stat-card">
            <p>Total Seniors</p>
            <h3>{overview.seniors?.length ?? 0}</h3>
          </div>
          <div className="stat-card">
            <p>Total Tasks</p>
            <h3>{overview.tasks?.length ?? 0}</h3>
          </div>
          <div className="stat-card">
            <p>Total Sessions</p>
            <h3>{overview.sessions?.length ?? 0}</h3>
          </div>
        </div>
      )}

      <div className="admin-list">
        {seniors.map((senior) => (
          <div key={senior.senior_id} className="admin-card">
            <div className="admin-card__header">
              <div>
                <h3>
                  {senior.first_name} {senior.last_name}
                </h3>
                <p className="admin-meta">
                  Needs: {(senior.needs || []).join(", ") || "None"}
                </p>
              </div>
              <button
                className="btn-primary"
                onClick={() => handleFindMatches(senior.senior_id)}
                disabled={loadingSeniorId === senior.senior_id}
              >
                {loadingSeniorId === senior.senior_id ? "Loading..." : "Find Matches"}
              </button>
            </div>

            {matchesBySenior[senior.senior_id] && (
              <div className="matches">
                {matchesBySenior[senior.senior_id].length === 0 ? (
                  <p className="admin-meta">No matches found.</p>
                ) : (
                  <table className="match-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Score</th>
                        <th>Distance (km)</th>
                        <th>Common Skills</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {matchesBySenior[senior.senior_id].map((match) => (
                        <tr key={match.student_id}>
                          <td>{match.name}</td>
                          <td>{match.total_score}</td>
                          <td>{match.distance_km}</td>
                          <td>{(match.common_skills || []).join(", ") || "—"}</td>
                          <td>
                            <button
                              className="btn-secondary"
                              onClick={() => handleCreateSession(senior.senior_id, match.student_id)}
                            >
                              Create Session
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {statusBySenior[senior.senior_id] && (
              <div className="status success">{statusBySenior[senior.senior_id]}</div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default AdminPanel;
