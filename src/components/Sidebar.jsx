
import { NavLink } from "react-router-dom";

const Sidebar = () => {
  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-main">E-SPORTS</span>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" end className="nav-item">
          📊 Dashboard
        </NavLink>

        <NavLink to="/register-users" className="nav-item">
          👤 Register Users
        </NavLink>

        {/* TOURNAMENT MANAGEMENT */}
        <NavLink to="/tournament-management" className="nav-item">
          🏆 Tournament Management
        </NavLink>

        {/* TOURNAMENT RESULTS */}
        <NavLink to="/tournament-results" className="nav-item">
          🏅 Tournament Results
        </NavLink>

        {/* LIVE CHAT SUPPORT */}
        <NavLink to="/support" className="nav-item">
          💬 Live Chat Support
        </NavLink>

        <NavLink to="/rooms" className="nav-item">
          🎮 Share Room ID & Password
        </NavLink>

        <NavLink to="/tdm-joins" className="nav-item">
          ⚔️ BGMI TOURNAMENT
        </NavLink>

        <NavLink to="/deposit-users" className="nav-item">
          💰 Deposit Users
        </NavLink>

        <NavLink to="/withdraw-requests" className="nav-item">
          💸 Withdraw Requests
        </NavLink>

        <NavLink
          to="/user-bank-details/akash123"
          className="nav-item"
        >
          🏦 Bank Details
        </NavLink>

        <NavLink to="/settings" className="nav-item">
          ⚙️ Settings
        </NavLink>
      </nav>
    </div>
  );
};

export default Sidebar;
