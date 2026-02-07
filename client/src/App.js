import { Link, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import StudentSignup from "./pages/StudentSignup";
import Dashboard from "./pages/Dashboard";

function App() {
  return (
    <div className="app-shell">
      <header className="top-nav">
        <h1>MarletMeets</h1>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/signup">Student Signup</Link>
          <Link to="/dashboard">Dashboard</Link>
        </nav>
      </header>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signup" element={<StudentSignup />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
