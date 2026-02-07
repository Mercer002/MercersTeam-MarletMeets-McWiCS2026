import { Link, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import StudentSignup from "./pages/StudentSignup";
import Dashboard from "./pages/Dashboard";
import MapTest from "./MapTest";

function App() {
  return (
    <div className="app-shell">
      <header className="top-nav">
        <h1>MarletMeets</h1>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/signup">Student Signup</Link>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/map-test">Map Test</Link>

        </nav>
      </header>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signup" element={<StudentSignup />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/map-test" element={<MapTest />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
