import { NavLink } from "react-router-dom";
import logo from "../assets/official-martlet_favicon.webp";

function Navbar() {
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
        <NavLink to="/signup">Student Signup</NavLink>
        <NavLink to="/senior">Senior Signup</NavLink>
        <NavLink to="/dashboard">Dashboard</NavLink>
        <NavLink to="/admin">Admin</NavLink>
      </nav>
    </header>
  );
}

export default Navbar;
