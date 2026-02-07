import React, { useState, useEffect } from "react";
import {
  GoogleMap,
  useLoadScript,
  Marker,
  Polyline,
  InfoWindow,
} from "@react-google-maps/api";

// 1. Map Settings
const mapContainerStyle = {
  width: "100%",
  height: "600px",
  borderRadius: "15px",
  boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
};

const center = {
  lat: 45.5017, // Montreal
  lng: -73.5673,
};

const options = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
};

// 2. Custom Icons (Using Google's default colored URLs)
const ICONS = {
  STUDENT: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
  SENIOR: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
};

export default function DashboardMap() {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
  });

  const [data, setData] = useState({ students: [], seniors: [], sessions: [] });
  const [selectedPerson, setSelectedPerson] = useState(null);

  // 3. Fetch Data from Your Backend
  useEffect(() => {
    fetch("http://localhost:5000/api/dashboard") // Ensure this matches your backend port
      .then((res) => res.json())
      .then((data) => {
        console.log("Map Data Loaded:", data); // Debugging
        setData(data);
      })
      .catch((err) => console.error("Error fetching map data:", err));
  }, []);

  if (loadError)
    return <div className="p-4 text-red-500">Error loading maps</div>;
  if (!isLoaded) return <div className="p-4">Loading Map...</div>;

  return (
    <div style={{ position: "relative" }}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        zoom={12}
        center={center}
        options={options}
      >
        {/* --- STUDENTS (Blue) --- */}
        {data.students?.map((student) => (
          <Marker
            key={`student-${student.student_id}`}
            position={{ lat: student.latitude, lng: student.longitude }}
            icon={ICONS.STUDENT}
            onClick={() => setSelectedPerson(student)}
          />
        ))}

        {/* --- SENIORS (Red) --- */}
        {data.seniors?.map((senior) => (
          <Marker
            key={`senior-${senior.senior_id}`}
            position={{ lat: senior.latitude, lng: senior.longitude }}
            icon={ICONS.SENIOR}
            onClick={() => setSelectedPerson(senior)}
          />
        ))}

        {/* --- SESSIONS (Green Lines) --- */}
        {data.sessions?.map((session, i) => (
          <Polyline
            key={i}
            path={[
              { lat: session.student_lat, lng: session.student_lng },
              { lat: session.senior_lat, lng: session.senior_lng },
            ]}
            options={{
              strokeColor: "#10B981", // Emerald Green
              strokeOpacity: 0.8,
              strokeWeight: 4,
              geodesic: true,
              icons: [
                {
                  icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 2 },
                  offset: "50%",
                  repeat: "20px",
                },
              ],
            }}
          />
        ))}

        {/* --- INFO WINDOW (Popups) --- */}
        {selectedPerson && (
          <InfoWindow
            position={{
              lat: selectedPerson.latitude,
              lng: selectedPerson.longitude,
            }}
            onCloseClick={() => setSelectedPerson(null)}
          >
            <div style={{ padding: "5px" }}>
              <h3 style={{ margin: 0, fontWeight: "bold" }}>
                {selectedPerson.first_name} {selectedPerson.last_name}
              </h3>
              <p style={{ margin: 0, color: "#666" }}>
                {selectedPerson.student_id ? "🎓 Student" : "👴 Senior"}
              </p>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* --- LEGEND --- */}
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          left: "20px",
          background: "white",
          padding: "10px",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
        }}
      >
        <div
          style={{ display: "flex", alignItems: "center", marginBottom: "5px" }}
        >
          <img
            src={ICONS.SENIOR}
            alt="Senior"
            style={{ width: "20px", marginRight: "5px" }}
          />
          <span>Senior</span>
        </div>
        <div
          style={{ display: "flex", alignItems: "center", marginBottom: "5px" }}
        >
          <img
            src={ICONS.STUDENT}
            alt="Student"
            style={{ width: "20px", marginRight: "5px" }}
          />
          <span>Student</span>
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: "20px",
              height: "4px",
              background: "#10B981",
              marginRight: "5px",
            }}
          ></div>
          <span>Match</span>
        </div>
      </div>
    </div>
  );
}
