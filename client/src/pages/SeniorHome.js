import { useEffect, useState } from "react";
import { useAuth } from "../components/AuthProvider";
import { createSeniorTask, deleteSeniorTask, fetchSeniorNotifications, fetchSeniorTasks } from "../services/api";

function SeniorHome() {
  const [tasks, setTasks] = useState([]);
  const [taskText, setTaskText] = useState("");
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [notifications, setNotifications] = useState([]);
  const [seniorPhone, setSeniorPhone] = useState("");
  const { user, loading } = useAuth();

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

  const addTask = async () => {
    if (!taskText.trim()) return;
    setStatus({ type: "loading", message: "Adding task..." });
    try {
      await createSeniorTask({ task_text: taskText.trim() });
      setTaskText("");
      await loadTasks();
      setStatus({ type: "success", message: "Task added." });
    } catch (err) {
      setStatus({ type: "error", message: "Could not add task." });
    }
  };

  const removeTask = async (taskId) => {
    try {
      await deleteSeniorTask(taskId);
      await loadTasks();
    } catch (err) {
      setStatus({ type: "error", message: "Could not delete task." });
    }
  };

  return (
    <section className="senior-home">
      <header className="senior-home__header">
        <div>
          <h2>Senior Home</h2>
          <p>Add tasks you want help with.</p>
        </div>
        <button className="btn-secondary" onClick={addTask}>
          + Add Task
        </button>
      </header>

      <div className="task-input">
        <input
          value={taskText}
          onChange={(e) => setTaskText(e.target.value)}
          placeholder="e.g., Grocery pickup, tech help"
        />
      </div>

      {notifications.length > 0 && (
        <div className="notification-list">
          {notifications.map((note) => (
            <div key={note.match_id} className="notification-card">
              <h3>
                {note.first_name} {note.last_name} selected you
              </h3>
              <p>Student phone: {note.student_phone}</p>
            </div>
          ))}
        </div>
      )}

      {status.message && <div className={`status ${status.type}`}>{status.message}</div>}

      <ul className="task-list">
        {tasks.length === 0 ? (
          <li>No tasks yet.</li>
        ) : (
          tasks.map((task) => (
            <li key={task.task_id}>
              <span>{task.task_text}</span>
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
