import React, { useState } from "react";
import { GoogleMap, Marker, InfoWindow } from "@react-google-maps/api";
import { useGoogleMaps } from "../components/GoogleMapsProvider";

const mapContainerStyle = {
  width: "100%",
  height: "520px",
  borderRadius: "16px",
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

const ICONS = {
  STUDENT: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
  SENIOR: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
};

export default function DashboardMap({ students = [], seniors = [] }) {
  const { isLoaded, loadError } = useGoogleMaps();
  const [selectedPerson, setSelectedPerson] = useState(null);

  if (loadError) return <div className="status error">Error loading maps.</div>;
  if (!isLoaded) return <div className="status">Loading map...</div>;

  return (
    <div style={{ position: "relative" }}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        zoom={12}
        center={center}
        options={options}
      >
        {students.map((student) => (
          <Marker
            key={`student-${student.student_id}`}
            position={{ lat: student.latitude, lng: student.longitude }}
            icon={ICONS.STUDENT}
            onClick={() => setSelectedPerson(student)}
          />
        ))}

        {seniors.map((senior) => (
          <Marker
            key={`senior-${senior.senior_id}`}
            position={{ lat: senior.latitude, lng: senior.longitude }}
            icon={ICONS.SENIOR}
            onClick={() => setSelectedPerson(senior)}
          />
        ))}
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
                {selectedPerson.student_id ? "Student" : "Senior"}
              </p>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      <div
        style={{
          position: "absolute",
          bottom: "16px",
          left: "16px",
          background: "white",
          padding: "10px 12px",
          borderRadius: "10px",
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
      </div>
    </div>
  );
}
