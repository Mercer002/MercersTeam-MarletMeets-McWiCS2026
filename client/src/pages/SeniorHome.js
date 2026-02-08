import { useEffect, useState } from "react";
import { useAuth } from "../components/AuthProvider";
import {
  createSeniorTask,
  deleteSeniorTask,
  fetchSeniorNotifications,
  fetchSeniorProfile,
  fetchSeniorTasks,
  updateSeniorProfile,
} from "../services/api";
import { formatPhone } from "../utils/formatPhone";

const LANGUAGES = ["English", "French", "Mandarin", "Arabic", "Spanish"];
const NEEDS = [
  { value: "grocery", label: "grocery" },
  { value: "shopping", label: "shopping" },
  { value: "companionship", label: "companionship" },
  { value: "walking", label: "walking" },
  { value: "errands", label: "errands" },
  { value: "translation", label: "translation" },
  { value: "tech_help", label: "tech help" },
  { value: "light_housekeeping", label: "light housekeeping" },
  { value: "meal_prep", label: "meal prep" },
  { value: "medication_pickup", label: "medication pickup" },
];

function SeniorHome() {
  const [tasks, setTasks] = useState([]);
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [notifications, setNotifications] = useState([]);
  const [seniorPhone, setSeniorPhone] = useState("");
  const [languages, setLanguages] = useState([]);
  const [showPrefs, setShowPrefs] = useState(false);
  const [customTask, setCustomTask] = useState("");
  const { user, loading } = useAuth();

  const formatLabel = (value) => {
    if (!value) return "";
    return value
      .replace(/_/g, " ")
      .split(" ")
      .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : ""))
      .join(" ");
  };

  const normalizeValue = (value) =>
    value
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/-+/g, "_");

  const loadTasks = async () => {
    const data = await fetchSeniorTasks();
    setTasks(data.tasks || []);
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (loading || !user) return;
      try {
        const data = await fetchSeniorTasks();
        if (!active) return;
        setTasks(data.tasks || []);
        const profileData = await fetchSeniorProfile();
        if (!active) return;
        setLanguages(profileData.senior?.languages || []);
        const notifData = await fetchSeniorNotifications();
        if (!active) return;
        setNotifications(notifData.notifications || []);
        setSeniorPhone(notifData.senior_phone || "");
      } catch (err) {
        if (!active) return;
        setStatus({ type: "error", message: "Could not load tasks." });
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [user, loading]);

  const removeTask = async (taskId) => {
    try {
      await deleteSeniorTask(taskId);
      await loadTasks();
    } catch (err) {
      setStatus({ type: "error", message: "Could not delete task." });
    }
  };

  const addCustomTask = async () => {
    if (!customTask.trim()) return;
    setStatus({ type: "loading", message: "Adding task..." });
    try {
      await createSeniorTask({ task_text: customTask.trim() });
      setCustomTask("");
      await loadTasks();
      setStatus({ type: "success", message: "Task added." });
    } catch (err) {
      setStatus({ type: "error", message: "Could not add task." });
    }
  };

  const toggleNeed = async (value) => {
    const normalized = normalizeValue(value);
    const existing = tasks.find(
      (task) => normalizeValue(task.task_text || "") === normalized
    );
    if (existing) {
      await removeTask(existing.task_id);
    } else {
      await createSeniorTask({ task_text: value });
      await loadTasks();
    }
  };

  const toggleLanguage = (value) => {
    setLanguages((prev) => {
      const has = prev.includes(value);
      return has ? prev.filter((item) => item !== value) : [...prev, value];
    });
  };

  const saveLanguages = async () => {
    if (languages.length === 0) {
      setStatus({ type: "error", message: "Select at least one language." });
      return;
    }
    setStatus({ type: "loading", message: "Saving languages..." });
    try {
      const response = await updateSeniorProfile({ languages });
      setLanguages(response.senior?.languages || []);
      setStatus({ type: "success", message: "Languages saved." });
      setShowPrefs(false);
    } catch (err) {
      setStatus({ type: "error", message: "Could not save languages." });
    }
  };

  return (
    <section className="senior-home">
      <header className="senior-home__header">
        <div>
          <h2>Senior Home 🌿</h2>
          <p>Add tasks you want help with.</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button className="btn-secondary" onClick={() => setShowPrefs((prev) => !prev)}>
            {showPrefs ? "Close Needs/Languages" : "+ Needs/Languages"}
          </button>
        </div>
      </header>

      {showPrefs && (
        <div className="pref-card">
          <h3>Needs/Languages</h3>
          <p className="dashboard__subtext">Add specific needs in the task list below.</p>
          <div className="skill-input">
            <input
              value={customTask}
              onChange={(e) => setCustomTask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomTask();
                }
              }}
              placeholder="Add a task (e.g., mail pickup)"
            />
            <button className="btn-secondary" type="button" onClick={addCustomTask}>
              Add Task
            </button>
          </div>
          <div className="checkbox-group">
            {(() => {
              const defaultValues = NEEDS.map((need) => need.value);
              const customNeeds = tasks
                .map((task) => ({
                  value: normalizeValue(task.task_text || ""),
                  label: task.task_text || "",
                  task_id: task.task_id,
                }))
                .filter((task) => task.value && !defaultValues.includes(task.value));
              return [
                ...NEEDS.map((need) => ({ ...need, isCustom: false })),
                ...customNeeds.map((task) => ({
                  value: task.value,
                  label: task.label,
                  isCustom: true,
                  task_id: task.task_id,
                })),
              ].map((need) => {
                const normalized = normalizeValue(need.value);
                const isChecked = tasks.some(
                  (task) => normalizeValue(task.task_text || "") === normalized
                );
                return (
                  <div key={need.value} className="checkbox-row checkbox-row--custom">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleNeed(need.value)}
                      />
                      <span>{formatLabel(need.label)}</span>
                    </label>
                    {need.isCustom && need.task_id && (
                      <button
                        type="button"
                        className="skill-remove"
                        onClick={() => removeTask(need.task_id)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                );
              });
            })()}
          </div>
          <div className="checkbox-group">
            {LANGUAGES.map((language) => (
              <label key={language} className="checkbox-row">
                <input
                  type="checkbox"
                  checked={languages.includes(language)}
                  onChange={() => toggleLanguage(language)}
                />
                <span>{language}</span>
              </label>
            ))}
          </div>
          <button className="btn-primary" type="button" onClick={saveLanguages}>
            Save Languages
          </button>
        </div>
      )}

      {notifications.length > 0 && (
        <div className="notification-list">
          {notifications.map((note) => (
            <div key={note.match_id} className="notification-card">
              <h3>
                {note.first_name} {note.last_name} selected you
              </h3>
                <p>Student phone: {formatPhone(note.student_phone)}</p>
            </div>
          ))}
        </div>
      )}

      {status.message && <div className={`status ${status.type}`}>{status.message}</div>}

      <h3>Current Tasks</h3>
      <ul className="task-list">
        {tasks.length === 0 ? (
          <li>No tasks yet.</li>
        ) : (
          tasks.map((task) => (
            <li key={task.task_id}>
              <span>{formatLabel(task.task_text)}</span>
              <button className="btn-secondary" onClick={() => removeTask(task.task_id)}>
                Remove
              </button>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

export default SeniorHome;
