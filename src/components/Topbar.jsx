// src/components/Topbar.jsx
import { useNavigate } from "react-router-dom";
import "./Topbar.css";

const Topbar = () => {
  const now = new Date().toLocaleString();
  const navigate = useNavigate();

  const handleLogout = () => {
    // admin flag hatao
    localStorage.removeItem("bgmi_admin_logged_in");
    // login page pe bhejo
    navigate("/admin-login", { replace: true });
  };

  return (
    <div className="topbar">
      <div className="topbar-left">
        <h1 className="topbar-title">Free Fire Esports Control Room</h1>
        
      </div>
      <div className="topbar-right">
        <span className="topbar-time">{now}</span>
        <span className="topbar-badge">ADMIN</span>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
};

export default Topbar;