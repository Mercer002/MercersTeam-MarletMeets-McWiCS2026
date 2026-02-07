import React from "react";
import { GoogleMap, useLoadScript } from "@react-google-maps/api";

const center = { lat: 45.5019, lng: -73.5674 }; // Montreal

export default function MapTest() {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
  });

  if (loadError) return <div>Map error (check console).</div>;
  if (!isLoaded) return <div>Loading map…</div>;

  return (
    <div style={{ height: 450, width: "100%" }}>
      <GoogleMap
        center={center}
        zoom={12}
        mapContainerStyle={{ height: "100%", width: "100%" }}
      />
    </div>
  );
}
