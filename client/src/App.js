import { Link, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import StudentSignup from "./pages/StudentSignup";
import Dashboard from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel";

function App() {
  return (
    <div className="app-shell">
      <header className="top-nav">
        <h1>MarletMeets</h1>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/signup">Student Signup</Link>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/admin">Admin</Link>
        </nav>
      </header>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signup" element={<StudentSignup />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
