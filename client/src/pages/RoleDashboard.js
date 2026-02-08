import { useEffect, useState } from "react";
import { useAuth } from "../components/AuthProvider";
import Dashboard from "./Dashboard";
import DashboardMap from "./DashboardMap";
import { fetchSeniorNotifications, fetchStudentSelection } from "../services/api";

function RoleDashboard() {
  const { user } = useAuth();
  const [selections, setSelections] = useState([]);
  const [studentPhone, setStudentPhone] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [seniorPhone, setSeniorPhone] = useState("");
  const [mapData, setMapData] = useState({ students: [], seniors: [] });

  useEffect(() => {
    let active = true;
    const loadStudent = async () => {
      const data = await fetchStudentSelection();
      if (!active) return;
      setSelections(data.selections || []);
      setStudentPhone(data.student_phone || "");
      if (data.selections?.length) {
        const seniors = (data.selections || [])
          .filter((sel) => sel.latitude && sel.longitude)
          .map((sel) => ({
            senior_id: sel.senior_id,
            first_name: sel.first_name,
            last_name: sel.last_name,
            latitude: Number(sel.latitude),
            longitude: Number(sel.longitude),
          }));
        const students = data.student_location?.latitude && data.student_location?.longitude
          ? [
              {
                student_id: "me",
                first_name: "You",
                last_name: "",
                latitude: Number(data.student_location.latitude),
                longitude: Number(data.student_location.longitude),
              },
            ]
          : [];
        setMapData({ students, seniors });
      } else {
        setMapData({ students: [], seniors: [] });
      }
    };
    const loadSenior = async () => {
      const data = await fetchSeniorNotifications();
      if (!active) return;
      setNotifications(data.notifications || []);
      setSeniorPhone(data.senior_phone || "");
    };

    const load = async () => {
      if (user?.role === "student") await loadStudent();
      if (user?.role === "senior") await loadSenior();
    };
    load();

    const handleSelectionUpdate = () => {
      if (user?.role === "student") loadStudent();
      if (user?.role === "senior") loadSenior();
    };
    window.addEventListener("selection-updated", handleSelectionUpdate);

    let intervalId = null;
    if (user?.role === "student") {
      intervalId = setInterval(loadStudent, 5000);
    }
    return () => {
      active = false;
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener("selection-updated", handleSelectionUpdate);
    };
  }, [user]);

  if (user?.role === "admin") return <Dashboard />;

  if (user?.role === "student") {
    return (
      <section className="student-dashboard">
        <h2>Student Dashboard</h2>
        {selections.length === 0 ? (
          <p>Select a senior from Home to unlock contact details.</p>
        ) : (
          <div className="contact-list">
            {selections.map((selection) => (
              <div key={selection.match_id} className="contact-card">
                <h3>
                  {selection.first_name} {selection.last_name}
                </h3>
                <p>Senior phone: {selection.phone}</p>
              </div>
            ))}
          </div>
        )}
        {selections.length > 0 && mapData.students.length > 0 && (
          <div className="dashboard-map-wrap">
            <DashboardMap students={mapData.students} seniors={mapData.seniors} />
          </div>
        )}
      </section>
    );
  }

  if (user?.role === "senior") {
    return (
      <section className="senior-home">
        <h2>Senior Dashboard</h2>
        {notifications.length === 0 ? (
          <p>No student selections yet.</p>
        ) : (
          <div className="notification-list">
            {notifications.map((note) => (
              <div key={note.match_id} className="notification-card">
                <h3>
                  {note.first_name} {note.last_name} selected you
                </h3>
                <p>Student phone: {note.student_phone}</p>
                <p>Your phone: {seniorPhone || "Not available"}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  }

  return null;
}

export default RoleDashboard;
