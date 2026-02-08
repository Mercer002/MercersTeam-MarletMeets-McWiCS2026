import { NavLink, useNavigate } from "react-router-dom";
import logo from "../assets/official-martlet_favicon.webp";
import { useAuth } from "./AuthProvider";

function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header className="top-nav">
      <div className="brand">
        <img src={logo} alt="MarletMeets logo" className="brand__logo" />
        <span className="brand__text">MarletMeets</span>
      </div>
      <nav className="nav-links">
        <NavLink to="/" end>
          Home
        </NavLink>
        <NavLink to="/dashboard">Dashboard</NavLink>
        {user ? (
          <button className="btn-secondary btn-link" type="button" onClick={handleLogout}>
            Logout
          </button>
        ) : (
          <NavLink to="/login">Login</NavLink>
        )}
      </nav>
    </header>
  );
}

export default Navbar;
