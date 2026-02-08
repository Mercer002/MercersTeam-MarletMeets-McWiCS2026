import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";
import { GoogleMapsProvider } from "./components/GoogleMapsProvider";
import { AuthProvider } from "./components/AuthProvider";

const container = document.getElementById("root");
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <AuthProvider>
      <GoogleMapsProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </GoogleMapsProvider>
    </AuthProvider>
  </React.StrictMode>
);
