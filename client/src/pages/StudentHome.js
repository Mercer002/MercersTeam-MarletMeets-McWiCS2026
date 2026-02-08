import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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

const SKILLS = [
  { value: "tech_support", label: "tech support" },
  { value: "groceries", label: "groceries" },
  { value: "companionship", label: "companionship" },
  { value: "errands", label: "errands" },
  { value: "translation", label: "translation" },
];
const LANGUAGES = ["English", "French", "Mandarin", "Arabic", "Spanish"];

function StudentHome() {
  const [matches, setMatches] = useState([]);
  const [profile, setProfile] = useState({ skills: [], languages: [] });
  const [selectedSeniorIds, setSelectedSeniorIds] = useState([]);
  const [pendingSenior, setPendingSenior] = useState(null);
  const [confirmMode, setConfirmMode] = useState("select");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [customSkill, setCustomSkill] = useState("");
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const formatLabel = (value) =>
    value
      .replace(/_/g, " ")
      .split(" ")
      .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : ""))
      .join(" ");

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

  const addCustomSkill = () => {
    const raw = customSkill.trim();
    if (!raw) return;
    const normalized = raw.toLowerCase().replace(/\s+/g, "_");
    setProfile((prev) => {
      const next = prev.skills?.includes(normalized)
        ? prev.skills
        : [...(prev.skills || []), normalized];
      return { ...prev, skills: next };
    });
    setCustomSkill("");
  };

  const removeCustomSkill = (value) => {
    const defaultValues = SKILLS.map((skill) => skill.value);
    if (defaultValues.includes(value)) return;
    setProfile((prev) => {
      const next = (prev.skills || []).filter((item) => item !== value);
      return { ...prev, skills: next };
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
          <h2>Student Home 🤝</h2>
          <p>Find seniors who match your skills and location.</p>
        </div>
        <button className="btn-secondary" onClick={() => setShowPrefs((prev) => !prev)}>
          {showPrefs ? "Close Skills/Languages" : "+ Skills/Languages"}
        </button>
      </header>

      {showPrefs && (
        <div className="pref-card">
          <h3>Skills/Languages</h3>
          <div className="skill-input">
            <input
              value={customSkill}
              onChange={(e) => setCustomSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomSkill();
                }
              }}
              placeholder="Add a skill (e.g., pet care)"
            />
            <button className="btn-secondary" type="button" onClick={addCustomSkill}>
              Add Skill
            </button>
          </div>
          <div className="checkbox-group">
            {(() => {
              const defaultValues = SKILLS.map((skill) => skill.value);
              const customSkills = (profile.skills || []).filter(
                (value) => !defaultValues.includes(value)
              );
              return [
                ...SKILLS.map((skill) => ({ ...skill, isCustom: false })),
                ...customSkills.map((value) => ({
                  value,
                  label: formatLabel(value),
                  isCustom: true,
                })),
              ].map((skill) => (
                <div key={skill.value} className="checkbox-row checkbox-row--custom">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={profile.skills?.includes(skill.value)}
                      onChange={() => toggleListValue("skills", skill.value)}
                    />
                    <span>{formatLabel(skill.label)}</span>
                  </label>
                  {skill.isCustom && (
                    <button
                      type="button"
                      className="skill-remove"
                      onClick={() => removeCustomSkill(skill.value)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ));
            })()}
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
                  Common skills:{" "}
                  {(match.common_skills || []).length
                    ? match.common_skills.map((skill) => formatLabel(skill)).join(", ")
                    : "None"}
                </p>
              </article>
            ))
          )}
        </div>
      )}

      {confirmOpen && pendingSenior &&
        createPortal(
          <div className="mm-modal-backdrop">
            <div className="mm-modal">
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
          </div>,
          document.body
        )}
    </section>
  );
}

export default StudentHome;
