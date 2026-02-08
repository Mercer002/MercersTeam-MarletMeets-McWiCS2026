import { useEffect, useState } from "react";
import { useAuth } from "../components/AuthProvider";
import Dashboard from "./Dashboard";
import { useGoogleMaps } from "../components/GoogleMapsProvider";
import DashboardMap from "./DashboardMap";
import {
  fetchSeniorNotifications,
  fetchStudentMapData,
  fetchStudentSelection,
} from "../services/api";
import { formatPhone } from "../utils/formatPhone";

function RoleDashboard() {
  const { user } = useAuth();
  const [selections, setSelections] = useState([]);
  const [studentPhone, setStudentPhone] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [seniorPhone, setSeniorPhone] = useState("");
  const [mapData, setMapData] = useState({ students: [], seniors: [] });
  const { isLoaded } = useGoogleMaps();

  useEffect(() => {
    let active = true;
    const loadStudent = async () => {
      const data = await fetchStudentSelection();
      if (!active) return;
      setSelections(data.selections || []);
      setStudentPhone(data.student_phone || "");
      if (!data.selections?.length) {
        setMapData({ students: [], seniors: [] });
        return;
      }

      const mapPayload = await fetchStudentMapData();
      if (!active) return;
      let seniors = (mapPayload.seniors || [])
        .filter((s) => s.latitude && s.longitude)
        .map((s) => ({
          senior_id: s.senior_id,
          first_name: s.first_name,
          last_name: s.last_name,
          latitude: Number(s.latitude),
          longitude: Number(s.longitude),
          address: s.address,
        }));
      let students = [];
      if (mapPayload.student?.latitude && mapPayload.student?.longitude) {
        students = [
          {
            student_id: "me",
            first_name: "You",
            last_name: "",
            latitude: Number(mapPayload.student.latitude),
            longitude: Number(mapPayload.student.longitude),
          },
        ];
      }

      if (isLoaded && typeof window !== "undefined" && window.google) {
        const geocoder = new window.google.maps.Geocoder();
        if (seniors.length === 0) {
          const results = await Promise.all(
            (mapPayload.seniors || []).map(
              (sel) =>
                new Promise((resolve) => {
                  if (!sel.address) return resolve(null);
                  geocoder.geocode({ address: sel.address }, (res, status) => {
                    if (status === "OK" && res[0]?.geometry?.location) {
                      const loc = res[0].geometry.location;
                      resolve({
                        senior_id: sel.senior_id,
                        first_name: sel.first_name,
                        last_name: sel.last_name,
                        latitude: loc.lat(),
                        longitude: loc.lng(),
                      });
                    } else {
                      resolve(null);
                    }
                  });
                })
            )
          );
          seniors = results.filter(Boolean);
        }
        if (students.length === 0 && mapPayload.student?.address) {
          const studentCoords = await new Promise((resolve) => {
            geocoder.geocode({ address: mapPayload.student.address }, (res, status) => {
              if (status === "OK" && res[0]?.geometry?.location) {
                const loc = res[0].geometry.location;
                resolve({ latitude: loc.lat(), longitude: loc.lng() });
              } else {
                resolve(null);
              }
            });
          });
          if (studentCoords) {
            students = [
              {
                student_id: "me",
                first_name: "You",
                last_name: "",
                latitude: studentCoords.latitude,
                longitude: studentCoords.longitude,
              },
            ];
          }
        }
      }
      setMapData({ students, seniors });
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
  }, [user, isLoaded]);

  if (user?.role === "admin") return <Dashboard />;

  if (user?.role === "student") {
    return (
      <section className="student-dashboard">
        <h2>Student Dashboard 🗺️</h2>
        {selections.length === 0 ? (
          <p>Select a senior from Home to unlock contact details.</p>
        ) : (
          <div className="contact-list">
            {selections.map((selection) => (
              <div key={selection.match_id} className="contact-card">
                <h3>
                  {selection.first_name} {selection.last_name}
                </h3>
                <p>Senior phone: {formatPhone(selection.phone)}</p>
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
        <h2>Senior Dashboard 👋</h2>
        {notifications.length === 0 ? (
          <p>No student selections yet.</p>
        ) : (
          <div className="notification-list">
            {notifications.map((note) => (
              <div key={note.match_id} className="notification-card">
                <h3>
                  {note.first_name} {note.last_name} selected you
                </h3>
                <p>Student phone: {formatPhone(note.student_phone)}</p>
                <p>Your phone: {formatPhone(seniorPhone) || "Not available"}</p>
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
