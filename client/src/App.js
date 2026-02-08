import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel";
import StudentHome from "./pages/StudentHome";
import SeniorHome from "./pages/SeniorHome";
import { useAuth } from "./components/AuthProvider";
import RoleDashboard from "./pages/RoleDashboard";

function RoleHome() {
  const { user, loading } = useAuth();
  if (loading) return <div className="status">Loading...</div>;
  if (!user) return <Signup />;
  if (user.role === "student") return <StudentHome />;
  if (user.role === "senior") return <SeniorHome />;
  if (user.role === "admin") return <AdminPanel />;
  return <Home />;
}

function RequireAuth({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="status">Loading...</div>;
  if (!user) return <Navigate to="/" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <div className="app-shell">
      <Navbar />

      <main className="main-content">
        <Routes>
          <Route path="/" element={<RoleHome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/senior" element={<Signup />} />
          <Route
            path="/student/home"
            element={
              <RequireAuth roles={["student"]}>
                <StudentHome />
              </RequireAuth>
            }
          />
          <Route
            path="/senior/home"
            element={
              <RequireAuth roles={["senior"]}>
                <SeniorHome />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard"
            element={
              <RequireAuth roles={["student", "senior", "admin"]}>
                <RoleDashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireAuth roles={["admin"]}>
                <AdminPanel />
              </RequireAuth>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;
