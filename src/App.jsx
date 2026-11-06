// src/App.jsx - TOURNAMENT MANAGEMENT + RESULTS + LIVE SUPPORT ROUTES

import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

import Dashboard from "./pages/Dashboard";
import RegisterUsers from "./pages/RegisterUsers";
import RoomManagement from "./pages/RoomManagement";
import TdmJoins from "./pages/TdmJoins";
import Settings from "./pages/Settings";
import AdminLogin from "./pages/AdminLogin";

import DepositUsers from "./pages/DepositUsers";
import WithdrawRequests from "./pages/WithdrawRequests";
import UserBankDetails from "./pages/UserBankDetails";

import AdminTournamentDetail from "./pages/AdminTournamentDetail";

// Tournament Management
import TournamentManagement from "./pages/TournamentManagement";

// Tournament Results / Winning
import TournamentResults from "./pages/TournamentResults";

// Live Chat Support
import AdminSupport from "./pages/AdminSupport";

import "./styles/theme.css";

// ===== ADMIN LOGIN CHECK =====
const isAdminLoggedIn = () =>
  localStorage.getItem("bgmi_admin_logged_in") === "true";

// ===== LAYOUT FOR ALL ADMIN PAGES =====
const AdminLayout = () => (
  <div className="app-root">
    <Sidebar />

    <div className="app-main">
      <Topbar />

      <div className="app-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />

          <Route
            path="/register-users"
            element={<RegisterUsers />}
          />

          <Route
            path="/tournament-management"
            element={<TournamentManagement />}
          />

          {/* TOURNAMENT RESULTS / WINNING */}
          <Route
            path="/tournament-results"
            element={<TournamentResults />}
          />

          {/* LIVE CHAT SUPPORT */}
          <Route
            path="/support"
            element={<AdminSupport />}
          />

          <Route
            path="/rooms"
            element={<RoomManagement />}
          />

          <Route
            path="/tdm-joins"
            element={<TdmJoins />}
          />

          <Route
            path="/deposit-users"
            element={<DepositUsers />}
          />

          <Route
            path="/withdraw-requests"
            element={<WithdrawRequests />}
          />

          <Route
            path="/user-bank-details/:userId"
            element={<UserBankDetails />}
          />

          <Route
            path="/tournament/:id"
            element={<AdminTournamentDetail />}
          />

          <Route
            path="/settings"
            element={<Settings />}
          />

          {/* UNKNOWN ROUTE → DASHBOARD */}
          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>
      </div>
    </div>
  </div>
);

// ===== PROTECTED ADMIN APP =====
const ProtectedApp = () => {
  if (!isAdminLoggedIn()) {
    return <Navigate to="/admin-login" replace />;
  }

  return <AdminLayout />;
};

// ===== MAIN APP =====
function App() {
  return (
    <Router>
      <Routes>
        {/* ADMIN LOGIN */}
        <Route
          path="/admin-login"
          element={<AdminLogin />}
        />

        {/* ALL PROTECTED ADMIN PAGES */}
        <Route
          path="/*"
          element={<ProtectedApp />}
        />
      </Routes>
    </Router>
  );
}

export default App;