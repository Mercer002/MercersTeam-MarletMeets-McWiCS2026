import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";
import {
  fetchStudentMatches,
  fetchStudentProfile,
  fetchStudentSelection,
  deselectSenior,
  selectSenior,
  updateStudentProfile,
} from "../services/api";

const SKILLS = ["tech_support", "groceries", "companionship", "errands", "translation"];
const LANGUAGES = ["English", "French", "Mandarin", "Arabic", "Spanish"];

function StudentHome() {
  const [matches, setMatches] = useState([]);
  const [profile, setProfile] = useState({ skills: [], languages: [] });
  const [selectedSeniorIds, setSelectedSeniorIds] = useState([]);
  const [pendingSenior, setPendingSenior] = useState(null);
  const [confirmMode, setConfirmMode] = useState("select");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (loading || !user) return;
      try {
        const profileData = await fetchStudentProfile();
        if (!active) return;
        setProfile(profileData.student || { skills: [], languages: [] });
        const selectionData = await fetchStudentSelection();
        if (!active) return;
        if (selectionData.selections?.length) {
          setSelectedSeniorIds(selectionData.selections.map((sel) => sel.senior_id));
        }
        if ((profileData.student?.skills || []).length > 0) {
          const matchData = await fetchStudentMatches();
          if (!active) return;
          setMatches(matchData.matches || []);
        } else {
          setMatches([]);
        }
      } catch (err) {
        if (!active) return;
        setStatus({ type: "error", message: "Could not load matches." });
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [user, loading]);

  const toggleListValue = (field, value) => {
    setProfile((prev) => {
      const has = (prev[field] || []).includes(value);
      const next = has ? prev[field].filter((item) => item !== value) : [...prev[field], value];
      return { ...prev, [field]: next };
    });
  };

  const savePrefs = async () => {
    if ((profile.skills || []).length === 0) {
      setStatus({ type: "error", message: "Select at least one skill first." });
      return;
    }
    setStatus({ type: "loading", message: "Saving preferences..." });
    try {
      const response = await updateStudentProfile({
        skills: profile.skills || [],
        languages: profile.languages || [],
      });
      setProfile(response.student);
      if ((response.student?.skills || []).length > 0) {
        const matchData = await fetchStudentMatches();
        setMatches(matchData.matches || []);
      }
      setStatus({ type: "success", message: "Preferences saved." });
      setShowPrefs(false);
    } catch (err) {
      setStatus({ type: "error", message: "Could not save preferences." });
    }
  };

  return (
    <section className="student-home">
      <header className="student-home__header">
        <div>
          <h2>Student Home</h2>
          <p>Find seniors who match your skills and location.</p>
        </div>
        <button className="btn-secondary" onClick={() => setShowPrefs((prev) => !prev)}>
          + Add Skills/Languages
        </button>
      </header>

      {showPrefs && (
        <div className="pref-card">
          <h3>Your Skills</h3>
          <div className="checkbox-group">
            {SKILLS.map((skill) => (
              <label key={skill} className="checkbox-row">
                <input
                  type="checkbox"
                  checked={profile.skills?.includes(skill)}
                  onChange={() => toggleListValue("skills", skill)}
                />
                <span>{skill.replace("_", " ")}</span>
              </label>
            ))}
          </div>

          <h3>Languages</h3>
          <div className="checkbox-group">
            {LANGUAGES.map((language) => (
              <label key={language} className="checkbox-row">
                <input
                  type="checkbox"
                  checked={profile.languages?.includes(language)}
                  onChange={() => toggleListValue("languages", language)}
                />
                <span>{language}</span>
              </label>
            ))}
          </div>

          <button className="btn-primary" type="button" onClick={savePrefs}>
            Save Preferences
          </button>
        </div>
      )}

      {status.message && <div className={`status ${status.type}`}>{status.message}</div>}

      {(profile.skills || []).length === 0 ? (
        <div className="status">Add and save skills to see seniors.</div>
      ) : (
        <div className="match-grid">
          {matches.length === 0 ? (
            <p>No matches yet.</p>
          ) : (
            matches.map((match) => (
              <article
                key={match.senior_id}
                className={`match-card ${selectedSeniorIds.includes(match.senior_id) ? "match-card--selected" : ""}`}
                onClick={() => {
                  setPendingSenior(match);
                  setConfirmMode(selectedSeniorIds.includes(match.senior_id) ? "deselect" : "select");
                  setConfirmOpen(true);
                }}
              >
                <h3>
                  {match.first_name} {match.last_name}
                </h3>
                <p className="match-meta">Score: {match.total_score}</p>
                <p className="match-meta">Distance: {match.distance_km} km</p>
                <p className="match-meta">
                  Common skills: {(match.common_skills || []).join(", ") || "None"}
                </p>
              </article>
            ))
          )}
        </div>
      )}

      {confirmOpen && pendingSenior && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>{confirmMode === "select" ? "Confirm Selection" : "Remove Selection"}</h3>
            <p>
              {confirmMode === "select"
                ? `Select ${pendingSenior.first_name} ${pendingSenior.last_name} as your senior match?`
                : `Remove ${pendingSenior.first_name} ${pendingSenior.last_name} from your selections?`}
            </p>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => {
                  setConfirmOpen(false);
                  setPendingSenior(null);
                }}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={async () => {
                  try {
                    if (confirmMode === "select") {
                      await selectSenior({ senior_id: pendingSenior.senior_id });
                      setSelectedSeniorIds((prev) =>
                        prev.includes(pendingSenior.senior_id)
                          ? prev
                          : [...prev, pendingSenior.senior_id]
                      );
                      setStatus({ type: "success", message: "Senior selected." });
                      window.dispatchEvent(new Event("selection-updated"));
                      navigate("/dashboard");
                    } else {
                      await deselectSenior(pendingSenior.senior_id);
                      setSelectedSeniorIds((prev) =>
                        prev.filter((id) => id !== pendingSenior.senior_id)
                      );
                      setStatus({ type: "success", message: "Senior removed." });
                      window.dispatchEvent(new Event("selection-updated"));
                    }
                  } catch (err) {
                    setStatus({
                      type: "error",
                      message: confirmMode === "select" ? "Could not select senior." : "Could not remove senior.",
                    });
                  } finally {
                    setConfirmOpen(false);
                    setPendingSenior(null);
                  }
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default StudentHome;
